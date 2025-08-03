const STORAGE_KEYS = {
  OPENID: 'openid',
  USER_INFO: 'userInfo'
};

const getBaseUrl = () => {
  const app = getApp();
  return app ? app.globalData.baseUrl : 'http://localhost:3000/api';
};

// 跳转到用户信息填写页面
const redirectToUserInfoPage = () => {
  console.log('🚀 跳转到用户信息填写页面');
  
  return new Promise((resolve, reject) => {
    wx.navigateTo({
      url: '/pages/userInfo/userInfo?from=register',
      success: () => {
        console.log('✅ 跳转成功');
        // 注意：由于是页面跳转，这里不能直接resolve
        // 实际的注册逻辑会在userInfo页面中完成
        resolve({ status: 'redirected' });
      },
      fail: (error) => {
        console.error('❌ 跳转失败:', error);
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
    
    // 临时修复：确保管理员用户有正确的isAdmin字段
    // TODO: 删除此临时代码，后端应该正确返回isAdmin字段
    if (serverUserInfo && !serverUserInfo.hasOwnProperty('isAdmin')) {
      // 临时解决方案：检查用户名是否包含admin
      const isAdminUser = serverUserInfo.username?.toLowerCase().includes('admin');
      serverUserInfo.isAdmin = isAdminUser;
      console.log('🔧 临时设置isAdmin字段 (请检查后端实现):', isAdminUser, '用户:', serverUserInfo.username);
    }
    
    // 5. 判断用户是否已注册
    if (serverUserInfo && serverUserInfo.username && serverUserInfo.avatar) {
      console.log('✅ 用户已注册，用户名:', serverUserInfo.username);
      // 用户已注册：更新本地缓存并返回用户信息
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, serverUserInfo);
      return {
        status: 'loggedIn',
        userInfo: serverUserInfo
      };
    }
    
    // 调试日志：分析为什么判断失败
    console.log('❌ 用户注册状态判断失败:');
    console.log('  - serverUserInfo 存在:', !!serverUserInfo);
    console.log('  - username 存在:', !!serverUserInfo?.username);
    console.log('  - username 值:', serverUserInfo?.username);
    console.log('  - avatar 存在:', !!serverUserInfo?.avatar);
    console.log('  - avatar 值:', serverUserInfo?.avatar);
    
    // 6. 用户未注册
    return {
      status: 'unregistered'
    };
    
  } catch (error) {
    console.error('登录状态检查失败:', error);
    
    // 返回错误状态（根据需求可选）
    return {
      status: 'error',
      message: error.message || '登录检查异常'
    };
  }
};

const registerUser = async () => {
  try {
    console.log('🚀 开始用户注册流程...');
    
    // 1. 确保有openid（预先获取）
    await getOpenid();
    
    // 2. 跳转到用户信息填写页面
    const result = await redirectToUserInfoPage();
    
    if (result.status === 'redirected') {
      console.log('✅ 已跳转到用户信息填写页面');
      // 返回重定向状态，实际注册会在userInfo页面完成
      return { status: 'redirected' };
    }
    
    throw new Error('跳转失败');
    
  } catch (error) {
    console.error('用户注册流程启动失败:', error);
    return { status: 'error', reason: error.message };
  }
};

module.exports = {
  getOpenid,
  checkLoginStatus,
  registerUser
};