// utils/qiniuUploader.js
// 七牛云图片上传工具类

/**
 * 七牛云上传配置
 * 需要在使用前调用 init() 方法初始化配置
 */
class QiniuUploader {
  constructor() {
    this.config = {
      bucket: '',           // 存储空间名称
      domain: '',           // 域名
      upToken: '',          // 上传凭证
      region: 'z0'          // 存储区域，默认华东
    };
    this.isInitialized = false;
  }

  /**
   * 初始化七牛云配置
   * @param {Object} config 配置对象
   * @param {string} config.bucket 存储空间名称
   * @param {string} config.domain 域名 (如: https://your-domain.com)
   * @param {string} config.upToken 上传凭证
   * @param {string} config.region 存储区域 (z0=华东, z1=华北, z2=华南, na0=北美, as0=东南亚)
   */
  init(config) {
    if (!config || !config.bucket || !config.domain || !config.upToken) {
      throw new Error('七牛云配置参数不完整，需要提供 bucket、domain 和 upToken');
    }

    this.config = {
      bucket: config.bucket,
      domain: config.domain.replace(/\/$/, ''), // 移除末尾的斜杠
      upToken: config.upToken,
      region: config.region || 'z0'
    };
    
    this.isInitialized = true;

  }

  /**
   * 生成文件存储路径
   * @param {string} pathType 路径类型：avatar|moment|post|other
   * @param {string} userId 用户ID
   * @param {string} originalFileName 原始文件名
   * @param {Object} options 额外选项
   * @returns {string} 生成的存储路径
   */
  generateFilePath(pathType = 'avatar', userId, originalFileName = '', options = {}) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    // 提取文件扩展名
    let ext = 'jpg'; // 默认扩展名
    if (originalFileName) {
      const dotIndex = originalFileName.lastIndexOf('.');
      if (dotIndex > 0) {
        ext = originalFileName.substring(dotIndex + 1).toLowerCase();
      }
    }

    // 确保userId安全（移除特殊字符）
    const safeUserId = (userId || 'anonymous').replace(/[^\w-]/g, '');
    
    // 根据不同类型生成路径
    const pathTemplates = {
      // 用户头像：avatars/{userId}/{timestamp}_{random}.{ext}
      avatar: `avatars/${safeUserId}/${timestamp}_${random}.${ext}`,
      
      // 朋友圈图片：moments/{userId}/{date}/{timestamp}_{random}.{ext}
      moment: `moments/${safeUserId}/${this._getDateString()}/${timestamp}_${random}.${ext}`,
      
      // 动态/帖子图片：posts/{userId}/{date}/{timestamp}_{random}.{ext}
      post: `posts/${safeUserId}/${this._getDateString()}/${timestamp}_${random}.${ext}`,
      
      // 聊天图片：chats/{userId}/{date}/{timestamp}_{random}.{ext}
      chat: `chats/${safeUserId}/${this._getDateString()}/${timestamp}_${random}.${ext}`,
      
      // 其他图片：images/{userId}/{timestamp}_{random}.{ext}
      other: `images/${safeUserId}/${timestamp}_${random}.${ext}`,
      
      // 自定义路径：使用 options.customPath
      custom: options.customPath || `custom/${safeUserId}/${timestamp}_${random}.${ext}`
    };
    
    return pathTemplates[pathType] || pathTemplates.other;
  }

  /**
   * 获取日期字符串 (YYYY/MM/DD)
   * @private
   */
  _getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * 获取上传域名
   * 根据区域返回对应的上传域名
   */
  getUploadDomain() {
    const domainMap = {
      'z0': 'https://upload.qiniup.com',     // 华东
      'z1': 'https://upload-z1.qiniup.com', // 华北
      'z2': 'https://upload-z2.qiniup.com', // 华南
      'na0': 'https://upload-na0.qiniup.com', // 北美
      'as0': 'https://upload-as0.qiniup.com'  // 东南亚
    };
    
    return domainMap[this.config.region] || domainMap['z0'];
  }

  /**
   * 从后端获取上传Token
   * @param {string} pathType 路径类型
   * @param {string} userId 用户ID
   * @returns {Promise<string>} 上传Token
   */
  async getUploadTokenFromBackend(pathType, userId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://localhost:3000/api/qiniu/upload-token',
        method: 'GET',
        data: {
          pathType: pathType,
          userId: userId
        },
        header: {
          'Content-Type': 'application/json'
        },
        success: (response) => {
          if (response.statusCode === 200 && response.data.success) {
            resolve(response.data.data.uploadToken);
          } else {
            reject(new Error(response.data.message || '获取Token失败'));
          }
        },
        fail: (error) => {
          reject(new Error(error.errMsg || '网络请求失败'));
        }
      });
    });
  }

  /**
   * 上传图片文件到七牛云
   * @param {string} filePath 本地文件路径
   * @param {string} userId 用户ID（用于生成存储路径）
   * @param {Object} options 可选参数
   * @param {string} options.pathType 路径类型：avatar|moment|post|chat|other|custom
   * @param {Function} options.onProgress 上传进度回调
   * @param {string} options.customPath 自定义路径（当pathType为custom时使用）
   * @returns {Promise} 返回上传结果
   */
  async uploadImage(filePath, userId, options = {}) {
    try {
      // 检查初始化状态
      if (!this.isInitialized) {
        throw new Error('七牛云上传工具未初始化，请先调用 init() 方法');
      }

      // 验证参数
      if (!filePath) {
        throw new Error('文件路径不能为空');
      }

      if (!userId) {
        throw new Error('用户ID不能为空');
      }

      const pathType = options.pathType || 'avatar'; // 默认为头像类型
  

      // 生成存储路径
      const key = this.generateFilePath(pathType, userId, filePath, options);
  

      // 准备上传参数
      const uploadUrl = this.getUploadDomain();
      
      // 获取上传Token（优先从后端获取）
      let uploadToken = this.config.upToken;
      try {
        uploadToken = await this.getUploadTokenFromBackend(pathType, userId);
  
      } catch (error) {
  
        // 如果后端Token获取失败，使用配置文件中的Token
      }
      
      const formData = {
        token: uploadToken,
        key: key
      };

  

      // 执行上传
      const uploadResult = await this._performUpload(filePath, uploadUrl, formData, options.onProgress);
      
      // 构造最终的文件URL
      const fileUrl = `${this.config.domain}/${key}`;
      
      const result = {
        success: true,
        url: fileUrl,
        key: key,
        size: uploadResult.size || 0,
        hash: uploadResult.hash || '',
        uploadTime: new Date().toISOString()
      };


      return result;

    } catch (error) {

      
      const errorResult = {
        success: false,
        error: error.message || '上传失败',
        code: error.code || 'UPLOAD_ERROR'
      };

      throw errorResult;
    }
  }

  /**
   * 执行实际的上传操作
   * @private
   */
  _performUpload(filePath, uploadUrl, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const uploadTask = wx.uploadFile({
        url: uploadUrl,
        filePath: filePath,
        name: 'file',
        formData: formData,
        success: (res) => {
  
          
          if (res.statusCode !== 200) {
            reject(new Error(`上传失败，状态码: ${res.statusCode}`));
            return;
          }

          try {
            const data = JSON.parse(res.data);
            if (data.error) {
              reject(new Error(data.error));
              return;
            }
            resolve(data);
          } catch (parseError) {
    
            reject(new Error('上传响应格式错误'));
          }
        },
        fail: (error) => {
    
          reject(new Error(error.errMsg || '网络请求失败'));
        }
      });

      // 监听上传进度
      if (onProgress && typeof onProgress === 'function') {
        uploadTask.onProgressUpdate((progress) => {
          onProgress({
            progress: progress.progress,
            totalBytesSent: progress.totalBytesSent,
            totalBytesExpectedToSend: progress.totalBytesExpectedToSend
          });
        });
      }
    });
  }

  /**
   * 批量上传图片
   * @param {Array} filePaths 文件路径数组
   * @param {string} userId 用户ID
   * @param {Object} options 可选参数
   * @param {string} options.pathType 路径类型：avatar|moment|post|chat|other|custom
   * @param {Function} options.onProgress 上传进度回调
   * @param {string} options.customPath 自定义路径（当pathType为custom时使用）
   * @returns {Promise} 返回批量上传结果
   */
  async uploadImages(filePaths, userId, options = {}) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      throw new Error('文件路径数组不能为空');
    }

    const pathType = options.pathType || 'moment'; // 批量上传默认为朋友圈类型


    const results = [];
    const errors = [];

    for (let i = 0; i < filePaths.length; i++) {
      try {
        const result = await this.uploadImage(filePaths[i], userId, {
          pathType: pathType,
          customPath: options.customPath,
          onProgress: options.onProgress ? (progress) => {
            options.onProgress(i, progress);
          } : undefined
        });
        results.push(result);
      } catch (error) {
        errors.push({ index: i, filePath: filePaths[i], error });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      total: filePaths.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }

  /**
   * 验证文件是否为图片格式
   * @param {string} filePath 文件路径
   */
  isValidImageFile(filePath) {
    if (!filePath) return false;
    
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    
    return validExtensions.includes(ext);
  }

  /**
   * 获取当前配置信息（用于调试）
   */
  getConfig() {
    return {
      isInitialized: this.isInitialized,
      bucket: this.config.bucket,
      domain: this.config.domain,
      region: this.config.region,
      hasToken: !!this.config.upToken
    };
  }
}

// 创建单例实例
const qiniuUploader = new QiniuUploader();

module.exports = qiniuUploader;