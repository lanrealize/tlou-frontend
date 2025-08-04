// utils/qiniuConfig.js
// 七牛云配置文件

/**
 * 七牛云配置
 * ⚠️ 安全提醒：生产环境中请从后端接口获取upToken，不要硬编码敏感信息
 */
const QINIU_CONFIG = {
  // 存储空间名称
  bucket: 'tlou',
  
  // 域名 (你的七牛云绑定域名)
  domain: 'https://tlou.images.wltech-service.site',
  
  // 上传凭证 - ⚠️ 请通过后端接口获取，不要在这里写死
  upToken: 'NEED_TO_GET_FROM_BACKEND_API',
  
  // 存储区域 (华东)
  region: 'z0'
};

/**
 * 获取七牛云配置
 * 可以在这里添加动态获取配置的逻辑
 */
const getQiniuConfig = () => {
  // TODO: 可以从后端接口获取配置或从本地存储读取
  return QINIU_CONFIG;
};

/**
 * 从后端获取上传Token（推荐的安全做法）
 * 后端根据用户身份生成临时上传凭证
 */
const getUploadToken = async () => {
  try {
    // 🔒 安全方案：从后端接口获取临时Token
    const auth = require('./auth');
    let userId = 'anonymous';
    
    try {
      userId = await auth.getOpenid();
    } catch (e) {
  
    }

    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: 'http://localhost:3000/api/qiniu/upload-token', // 后端七牛云接口
        method: 'GET',
        data: {
          pathType: 'avatar', // 默认为头像类型
          userId: userId
        },
        header: {
          'Content-Type': 'application/json'
        },
        success: resolve,
        fail: reject
      });
    });

    if (response.statusCode === 200 && response.data.success) {
  
      return response.data.data.uploadToken;
    } else {
      throw new Error(response.data.message || '获取上传凭证失败');
    }
    
  } catch (error) {

    
    // 开发环境回退方案（仅用于开发测试）
    if (process.env.NODE_ENV === 'development' || QINIU_CONFIG.upToken === 'NEED_TO_GET_FROM_BACKEND_API') {
  
      try {
        // 如果有临时Token生成器，使用它
        const tokenGenerator = require('./generateToken');
        const tempToken = tokenGenerator.getQuickTestToken();
        if (tempToken && tempToken !== 'simplified_signature_') {
          return tempToken;
        }
      } catch (e) {
  
      }
      
      // 最后回退到配置文件中的Token
      if (QINIU_CONFIG.upToken !== 'NEED_TO_GET_FROM_BACKEND_API') {
        return QINIU_CONFIG.upToken;
      }
    }
    
    throw new Error('获取上传凭证失败，请检查网络连接或联系技术支持');
  }
};

/**
 * 验证配置是否完整
 */
const validateConfig = (config) => {
  const requiredFields = ['bucket', 'domain', 'upToken'];
  const missingFields = [];
  
  requiredFields.forEach(field => {
    if (!config[field] || config[field] === `YOUR_${field.toUpperCase()}_NAME` || 
        config[field] === `YOUR_${field.toUpperCase()}` ||
        config[field] === 'https://your-domain.com') {
      missingFields.push(field);
    }
  });
  
  if (missingFields.length > 0) {
    throw new Error(`七牛云配置不完整，缺少字段: ${missingFields.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  getQiniuConfig,
  getUploadToken,
  validateConfig,
  QINIU_CONFIG
};