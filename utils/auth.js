const { BACKEND_CONFIG } = require('../config/backend');

const STORAGE_KEYS = {
  OPENID: 'openid',
  USER_INFO: 'userInfo'
};

const getBaseUrl = () => {
  const app = getApp();
  return app ? app.globalData.baseUrl : BACKEND_CONFIG.BASE_URL;
};

// 触发用户信息弹出层（替代页面跳转）
const showUserInfoPopup = () => {
  return new Promise((resolve, reject) => {
    try {
      const app = getApp();
      app.showUserInfoPopup({
        reason: '请完善您的个人信息',
        intent: '',
        circleId: ''
      });
      resolve({ status: 'popup_shown' });
    } catch (error) {
      reject(new Error('显示用户信息弹出层失败'));
    }
  });
};

const getOpenid = async () => {
  // 从缓存获取 openid
  let openid = wx.getStorageSync(STORAGE_KEYS.OPENID);
  
  if (!openid) {
    // 获取微信登录凭证
    const loginResult = await new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      });
    });
    
    // 调用后端接口换取 openid
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${getBaseUrl()}/wechat/get-openid`,
        method: 'POST',
        data: { code: loginResult.code },
        header: {
          'Content-Type': 'application/json'
        },
        success: resolve,
        fail: reject
      });
    });
    
    // 验证响应数据
    if (res.statusCode === 200 && res.data?.success && res.data?.data?.openid) {
      openid = res.data.data.openid;
      // 存储到缓存
      wx.setStorageSync(STORAGE_KEYS.OPENID, openid);
    } else {
      throw new Error(res.data?.message || '获取 openid 失败');
    }
  }
  
  return openid;
};

const initUserAuthInStorage = async () => {
  try {
    // 1. 获取 openid（确保已缓存）
    const openid = await getOpenid();
    
    // 2. 检查本地用户信息
    const localUserInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO) || {};
    
    // 如果本地有完整用户信息，直接返回资料完整状态
    if (localUserInfo.username && localUserInfo.avatar && localUserInfo._id) {
      // ✅ 后端架构：_id 就是 openid，无需单独的 openid 字段
      return {
        status: 'complete',
        userInfo: localUserInfo
      };
    }
    
    // 3. 调用后端获取用户信息接口
    const userInfoRes = await new Promise((resolve, reject) => {
      wx.request({
        url: `${getBaseUrl()}/wechat/get-user-info`,
        method: 'POST',
        data: { openid },
        header: {
          'Content-Type': 'application/json'
        },
        success: resolve,
        fail: reject
      });
    });
    
    // 4. 处理用户信息响应
    if (userInfoRes.statusCode !== 200) {
      throw new Error(`HTTP ${userInfoRes.statusCode}: ${userInfoRes.data?.message || '网络错误'}`);
    }
    
    if (!userInfoRes.data?.success) {
      throw new Error(userInfoRes.data?.message || '获取用户信息失败');
    }
    
    // 修复：后端返回的用户信息在 data.user 中
    const serverUserInfo = userInfoRes.data.data?.user || userInfoRes.data.data;
    
    // 5. 判断用户资料是否完整
    if (serverUserInfo && serverUserInfo.username && serverUserInfo.avatar) {
      // ✅ 后端架构：_id 就是 openid（openid 值），无需额外字段
      // 用户资料完整：更新本地缓存并返回用户信息
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, serverUserInfo);
      return {
        status: 'complete',
        userInfo: serverUserInfo
      };
    }
    
    // 6. 用户资料未完善
    return {
      status: 'incomplete'
    };
    
  } catch (error) {
    // 返回错误状态（根据需求可选）
    return {
      status: 'error',
      message: error.message || '状态检查异常'
    };
  }
};

const completeUserProfile = async () => {
  try {
    // 1. 确保有openid（预先获取）
    await getOpenid();
    
    // 2. 触发用户信息弹出层
    const result = await showUserInfoPopup();
    
    if (result.status === 'popup_shown') {
      // 返回弹出层已显示状态，实际资料完善会在弹出层中完成
      return { status: 'popup_shown' };
    }
    
    throw new Error('显示弹出层失败');
    
  } catch (error) {
    return { status: 'error', reason: error.message };
  }
};

module.exports = {
  getOpenid,
  initUserAuthInStorage,
  completeUserProfile
};