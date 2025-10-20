// utils/devTools.js
// 开发者工具：用于测试不同的用户状态

/**
 * 开发者模式配置
 * 在开发时设置为 true，生产环境设置为 false
 */
const DEV_MODE = true; // ⚠️ 生产环境请改为 false

/**
 * 模拟未登录状态
 * 调用此方法后，用户会变为未登录状态（但 openid 仍然存在）
 */
function simulateLogout() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用，无法使用此功能');
    return false;
  }

  try {
    // 清除本地用户信息
    wx.removeStorageSync('userInfo');
    
    // 更新 userStore 状态
    const app = getApp();
    const userStore = app.getUserStore();
    const { USER_STATUS } = require('../store/userStore');
    
    userStore.setStatus(USER_STATUS.UNREGISTERED, {});
    
    console.log('✅ 已模拟未登录状态');
    console.log('💡 提示：刷新页面或重新进入页面生效');
    
    wx.showToast({
      title: '已切换到未登录状态',
      icon: 'success',
      duration: 2000
    });
    
    return true;
  } catch (error) {
    console.error('❌ 模拟未登录失败:', error);
    return false;
  }
}

/**
 * 恢复登录状态
 * 重新从后端获取用户信息
 */
async function restoreLogin() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用，无法使用此功能');
    return false;
  }

  try {
    const app = getApp();
    const userStore = app.getUserStore();
    
    // 重新检查登录状态
    await userStore.checkLoginStatus();
    
    console.log('✅ 已恢复登录状态');
    
    wx.showToast({
      title: '已恢复登录状态',
      icon: 'success',
      duration: 2000
    });
    
    return true;
  } catch (error) {
    console.error('❌ 恢复登录失败:', error);
    return false;
  }
}

/**
 * 快速切换登录状态
 */
function toggleLoginStatus() {
  const app = getApp();
  const userStore = app.getUserStore();
  
  if (userStore.isLoggedIn) {
    simulateLogout();
  } else {
    restoreLogin();
  }
}

/**
 * 在控制台打印当前用户状态
 */
function printUserStatus() {
  const app = getApp();
  const userStore = app.getUserStore();
  
  console.log('========== 用户状态 ==========');
  console.log('登录状态:', userStore.loginStatus);
  console.log('是否已登录:', userStore.isLoggedIn);
  console.log('用户信息:', userStore.userInfo);
  console.log('是否管理员:', userStore.isAdmin);
  console.log('==============================');
}

/**
 * 清除所有本地缓存（包括 openid）
 * ⚠️ 谨慎使用！会导致需要重新获取 openid
 */
function clearAllCache() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用，无法使用此功能');
    return false;
  }

  wx.showModal({
    title: '⚠️ 警告',
    content: '确定要清除所有缓存吗？这将清除 openid，需要重新登录小程序。',
    success: (res) => {
      if (res.confirm) {
        try {
          wx.clearStorageSync();
          
          console.log('✅ 已清除所有缓存');
          
          wx.showToast({
            title: '已清除缓存，请重启小程序',
            icon: 'success',
            duration: 2000
          });
          
          // 2秒后重启小程序
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/main/main'
            });
          }, 2000);
        } catch (error) {
          console.error('❌ 清除缓存失败:', error);
        }
      }
    }
  });
}

/**
 * 将开发者工具挂载到全局（方便在控制台调用）
 */
function installDevTools() {
  if (!DEV_MODE) {
    return;
  }

  const app = getApp();
  
  // 挂载到 app.devTools
  app.devTools = {
    simulateLogout,
    restoreLogin,
    toggleLoginStatus,
    printUserStatus,
    clearAllCache
  };
  
  console.log('========================================');
  console.log('🛠️  开发者工具已启用');
  console.log('========================================');
  console.log('可用命令（在控制台输入）：');
  console.log('');
  console.log('1. 切换登录状态：');
  console.log('   getApp().devTools.toggleLoginStatus()');
  console.log('');
  console.log('2. 模拟未登录：');
  console.log('   getApp().devTools.simulateLogout()');
  console.log('');
  console.log('3. 恢复登录：');
  console.log('   getApp().devTools.restoreLogin()');
  console.log('');
  console.log('4. 查看用户状态：');
  console.log('   getApp().devTools.printUserStatus()');
  console.log('');
  console.log('5. 清除所有缓存（⚠️谨慎使用）：');
  console.log('   getApp().devTools.clearAllCache()');
  console.log('========================================');
}

module.exports = {
  DEV_MODE,
  simulateLogout,
  restoreLogin,
  toggleLoginStatus,
  printUserStatus,
  clearAllCache,
  installDevTools
};

