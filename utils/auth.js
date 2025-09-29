const { BACKEND_CONFIG } = require('../config/backend');

const STORAGE_KEYS = {
  OPENID: 'openid',
  USER_INFO: 'userInfo'
};

const getBaseUrl = () => {
  const app = getApp();
  return app ? app.globalData.baseUrl : BACKEND_CONFIG.BASE_URL;
};

// 跳转到用户信息填写页面
const redirectToUserInfoPage = () => {
  return new Promise((resolve, reject) => {
    wx.navigateTo({
      url: '/pages/userInfo/userInfo?from=register',
      success: () => {
        // 注意：由于是页面跳转，这里不能直接resolve
        // 实际的注册逻辑会在userInfo页面中完成
        resolve({ status: 'redirected' });
      },
      fail: (error) => {
        reject(new Error('跳转到用户信息页面失败'));
      }
    });
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
    
    // 调用后端接口换取 openid（增加重试机制）
    let res;
    let lastError;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await new Promise((resolve, reject) => {
          wx.request({
            url: `${getBaseUrl()}/wechat/get-openid`,
            method: 'POST',
            data: { code: loginResult.code },
            header: {
              'Content-Type': 'application/json'
            },
            timeout: 15000,
            success: resolve,
            fail: reject
          });
        });
        break; // 成功则跳出循环
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          console.log(`🔄 获取openid失败，${1000 * (attempt + 1)}ms后重试:`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    if (!res) {
      throw lastError || new Error('获取openid失败');
    }
    
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

const checkLoginStatus = async () => {
  try {
    // 1. 获取 openid（确保已缓存）
    const openid = await getOpenid();
    
    // 2. 检查本地用户信息
    const localUserInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO) || {};
    
    // 如果本地有完整用户信息，直接返回已登录状态
    if (localUserInfo.username && localUserInfo.avatar) {
      return {
        status: 'loggedIn',
        userInfo: localUserInfo
      };
    }
    
    // 3. 调用后端获取用户信息接口（增加重试机制）
    let userInfoRes;
    let lastError;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        userInfoRes = await new Promise((resolve, reject) => {
          wx.request({
            url: `${getBaseUrl()}/wechat/get-user-info`,
            method: 'POST',
            data: { openid },
            header: {
              'Content-Type': 'application/json'
            },
            timeout: 15000,
            success: resolve,
            fail: reject
          });
        });
        break; // 成功则跳出循环
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          console.log(`🔄 获取用户信息失败，${1000 * (attempt + 1)}ms后重试:`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    if (!userInfoRes) {
      throw lastError || new Error('获取用户信息失败');
    }
    
    // 4. 处理用户信息响应
    if (userInfoRes.statusCode !== 200) {
      throw new Error(`HTTP ${userInfoRes.statusCode}: ${userInfoRes.data?.message || '网络错误'}`);
    }
    
    if (!userInfoRes.data?.success) {
      throw new Error(userInfoRes.data?.message || '获取用户信息失败');
    }
    
    // 修复：后端返回的用户信息在 data.user 中
    const serverUserInfo = userInfoRes.data.data?.user || userInfoRes.data.data;
    
    // 5. 判断用户是否已注册
    if (serverUserInfo && serverUserInfo.username && serverUserInfo.avatar) {
      // 用户已注册：更新本地缓存并返回用户信息
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, serverUserInfo);
      return {
        status: 'loggedIn',
        userInfo: serverUserInfo
      };
    }
    
    // 6. 用户未注册
    return {
      status: 'unregistered'
    };
    
  } catch (error) {
    // 返回错误状态（根据需求可选）
    return {
      status: 'error',
      message: error.message || '登录检查异常'
    };
  }
};

const registerUser = async () => {
  try {
    // 1. 确保有openid（预先获取）
    await getOpenid();
    
    // 2. 跳转到用户信息填写页面
    const result = await redirectToUserInfoPage();
    
    if (result.status === 'redirected') {
      // 返回重定向状态，实际注册会在userInfo页面完成
      return { status: 'redirected' };
    }
    
    throw new Error('跳转失败');
    
  } catch (error) {
    return { status: 'error', reason: error.message };
  }
};

module.exports = {
  getOpenid,
  checkLoginStatus,
  registerUser
};