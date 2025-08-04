// utils/avatarUploader.js
// 通用头像上传工具

const qiniuUploader = require('./qiniuUploader');
const qiniuConfig = require('./qiniuConfig');
const auth = require('./auth');

/**
 * 通用头像上传工具类
 * 可在多个页面中复用
 */
class AvatarUploader {
  /**
   * 选择并上传头像
   * @param {Object} options 配置选项
   * @param {string} options.userId 用户ID（可选，默认获取当前用户）
   * @param {Function} options.onStart 开始上传回调
   * @param {Function} options.onSuccess 上传成功回调 (avatarUrl) => {}
   * @param {Function} options.onError 上传失败回调 (error) => {}
   * @param {Function} options.onComplete 上传完成回调（无论成功失败）
   * @returns {Promise<string>} 返回头像URL
   */
  static async chooseAndUpload(options = {}) {
    const {
      userId,
      onStart,
      onSuccess,
      onError,
      onComplete
    } = options;

    try {
      // 开始上传回调
      onStart && onStart();
      
      // 选择图片
      const chooseResult = await this.chooseImage();
      
      // 上传图片
      const avatarUrl = await this.uploadToQiniu(chooseResult.tempFilePaths[0], userId);
      
      // 上传成功
      onSuccess && onSuccess(avatarUrl);
      
      return avatarUrl;
      
    } catch (error) {
      // 上传失败
      onError && onError(error);
      throw error;
    } finally {
      // 上传完成
      onComplete && onComplete();
    }
  }

  /**
   * 选择图片
   * @returns {Promise} 选择结果
   */
  static chooseImage() {
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      });
    });
  }

  /**
   * 上传图片到七牛云
   * @param {string} filePath 本地文件路径
   * @param {string} customUserId 自定义用户ID（可选）
   * @returns {Promise<string>} 返回图片URL
   */
  static async uploadToQiniu(filePath, customUserId) {
    try {
      // 初始化配置
      const config = qiniuConfig.getQiniuConfig ? qiniuConfig.getQiniuConfig() : qiniuConfig;
      
      // 获取上传Token
      let uploadToken;
      try {
        uploadToken = await qiniuConfig.getUploadToken();
      } catch (error) {
        throw new Error('获取上传凭证失败，请检查网络连接');
      }
      
      // 初始化上传器
      qiniuUploader.init({
        bucket: config.bucket,
        domain: config.domain,
        upToken: uploadToken,
        region: config.region
      });
      
      // 获取用户ID
      let userId = customUserId;
      if (!userId) {
        try {
          // 尝试从当前用户获取
          const app = getApp();
          const userStore = app.getUserStore();
          userId = userStore.userInfo?._id;
          
          // 如果还是没有，尝试从auth获取openid
          if (!userId) {
            userId = await auth.getOpenid();
          }
        } catch (error) {
          userId = 'anonymous';
        }
      }
      
      // 执行上传
      const result = await qiniuUploader.uploadImage(filePath, userId, {
        pathType: 'avatar'
      });
      
      if (result.success) {
        return result.url;
      } else {
        throw new Error(result.error || '上传失败');
      }
      
    } catch (error) {
      throw new Error(error.message || '头像上传失败');
    }
  }

  /**
   * 显示友好的错误提示
   * @param {Error} error 错误对象
   * @param {boolean} useModal 是否使用Modal显示（默认使用Toast）
   */
  static showErrorMessage(error, useModal = false) {
    let errorMessage = '头像上传失败';
    
    if (error.message) {
      if (error.message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络';
      } else if (error.message.includes('凭证')) {
        errorMessage = '上传权限验证失败';
      } else if (error.message.includes('格式')) {
        errorMessage = '图片格式不支持';
      } else if (error.message.includes('用户取消')) {
        return; // 用户取消不显示错误
      } else {
        errorMessage = error.message;
      }
    }

    if (useModal) {
      wx.showModal({
        title: '上传失败',
        content: errorMessage,
        showCancel: false,
        confirmText: '确定'
      });
    } else {
      wx.showToast({
        title: errorMessage,
        icon: 'error',
        duration: 2000
      });
    }
  }
}

module.exports = AvatarUploader;