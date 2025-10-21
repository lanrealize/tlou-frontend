// utils/devTools.js
// 开发者工具：用于测试不同的用户状态

/**
 * 开发者模式配置
 * 在开发时设置为 true，生产环境设置为 false
 */
const DEV_MODE = true; // ⚠️ 生产环境请改为 false

/**
 * 存储键常量
 */
const STORAGE_KEYS = {
  TEST_MODE: '__test_mode__',           // 是否在测试模式
  TEST_OPENID: '__test_openid__',       // 测试用的 openid
  REAL_IDENTITY: '__real_identity__'    // 真实身份备份
};

// ========================================
// 核心功能
// ========================================

/**
 * 🎭 开始测试模式
 * 
 * 功能：
 * 1. 保存真实身份
 * 2. 生成测试 openid
 * 3. 切换到未注册状态
 * 4. 现在可以测试注册流程
 * 
 * 使用场景：
 * - 测试用户注册流程
 * - 测试邀请加入功能
 * - 测试申请加入功能
 */
function startTestMode() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用');
    return false;
  }

  try {
    // 1. 检查是否已在测试模式
    const isInTestMode = wx.getStorageSync(STORAGE_KEYS.TEST_MODE);
    if (isInTestMode) {
      wx.showModal({
        title: '提示',
        content: '当前已在测试模式，请先结束当前测试',
        showCancel: false
      });
      return false;
    }

    // 2. 保存真实身份
    const realOpenid = wx.getStorageSync('openid');
    const realUserInfo = wx.getStorageSync('userInfo');
    
    if (!realOpenid) {
      wx.showModal({
        title: '提示',
        content: '未找到真实 openid，请先正常登录',
        showCancel: false
      });
      return false;
    }

    // 3. 生成测试 openid
    const testOpenid = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 4. 保存测试状态
    wx.setStorageSync(STORAGE_KEYS.TEST_MODE, true);
    wx.setStorageSync(STORAGE_KEYS.TEST_OPENID, testOpenid);
    wx.setStorageSync(STORAGE_KEYS.REAL_IDENTITY, {
      openid: realOpenid,
      userInfo: realUserInfo,
      timestamp: Date.now()
    });
    
    // 5. 切换到测试身份
    wx.setStorageSync('openid', testOpenid);
    wx.removeStorageSync('userInfo');
    
    // 6. 更新 userStore
    const app = getApp();
    const userStore = app.getUserStore();
    const { USER_STATUS } = require('../store/userStore');
    userStore.setStatus(USER_STATUS.UNREGISTERED, {});
    
    console.log('========================================');
    console.log('🎭 测试模式已开启');
    console.log('========================================');
    console.log('测试 openid:', testOpenid);
    console.log('💡 可以开始测试注册流程了');
    console.log('💡 测试完成后请调用: getApp().devTools.endTestMode()');
    console.log('========================================');
    
    wx.showModal({
      title: '✅ 测试模式已开启',
      content: '现在是全新用户，可以测试注册流程。\n\n测试完成后记得调用 endTestMode() 结束测试。',
      showCancel: false,
      confirmText: '开始测试',
      success: () => {
        // 刷新当前页面
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && currentPage.onLoad) {
          currentPage.onLoad(currentPage.options || {});
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ 开启测试模式失败:', error);
    return false;
  }
}

/**
 * 🔙 结束测试模式
 * 
 * 功能：
 * 1. 恢复真实身份
 * 2. 清理测试用户数据（调用后端注销接口）
 * 3. 清除测试标记
 * 
 * 注意：
 * - 会调用后端注销接口清理所有测试数据
 * - 如果清理失败，可以使用 emergencyRestore() 强制恢复
 */
async function endTestMode() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用');
    return false;
  }

  try {
    // 1. 检查是否在测试模式
    const isInTestMode = wx.getStorageSync(STORAGE_KEYS.TEST_MODE);
    if (!isInTestMode) {
      wx.showToast({ title: '当前不在测试模式', icon: 'none' });
      return false;
    }

    // 2. 获取测试 openid
    const testOpenid = wx.getStorageSync(STORAGE_KEYS.TEST_OPENID);
    const realIdentity = wx.getStorageSync(STORAGE_KEYS.REAL_IDENTITY);
    
    if (!realIdentity || !realIdentity.openid) {
      wx.showModal({
        title: '错误',
        content: '无法找到真实身份备份，请使用 emergencyRestore() 紧急恢复',
        showCancel: false
      });
      return false;
    }

    // 3. 询问是否清理测试数据
    return new Promise((resolve) => {
      wx.showModal({
        title: '结束测试模式',
        content: '是否清理测试用户数据？\n\n建议清理以保持数据库整洁。',
        confirmText: '清理',
        cancelText: '不清理',
        success: async (res) => {
          if (res.confirm) {
            // 清理测试数据
            const cleanupSuccess = await cleanupTestUser(testOpenid);
            if (cleanupSuccess) {
              restoreRealIdentity();
              resolve(true);
            } else {
              // 清理失败，询问是否强制恢复
              wx.showModal({
                title: '清理失败',
                content: '测试数据清理失败，是否仍要恢复真实身份？\n\n选择"是"将保留测试数据。',
                confirmText: '是',
                cancelText: '取消',
                success: (res2) => {
                  if (res2.confirm) {
                    restoreRealIdentity();
                    resolve(true);
                  } else {
                    resolve(false);
                  }
                }
              });
            }
          } else {
            // 不清理，直接恢复
            restoreRealIdentity();
            resolve(true);
          }
        }
      });
    });

  } catch (error) {
    console.error('❌ 结束测试模式失败:', error);
    return false;
  }
}

/**
 * 📊 获取测试状态
 * 
 * 返回当前测试模式的详细信息
 */
function getTestStatus() {
  const isInTestMode = wx.getStorageSync(STORAGE_KEYS.TEST_MODE);
  const testOpenid = wx.getStorageSync(STORAGE_KEYS.TEST_OPENID);
  const realIdentity = wx.getStorageSync(STORAGE_KEYS.REAL_IDENTITY);
  const currentOpenid = wx.getStorageSync('openid');
  
  const app = getApp();
  const userStore = app.getUserStore();
  
  console.log('========================================');
  console.log('📊 测试状态');
  console.log('========================================');
  console.log('是否在测试模式:', isInTestMode ? '是 ✅' : '否');
  console.log('');
  
  if (isInTestMode) {
    console.log('🎭 测试模式详情:');
    console.log('测试 openid:', testOpenid);
    console.log('当前 openid:', currentOpenid);
    console.log('');
    console.log('💾 真实身份备份:');
    console.log('真实 openid:', realIdentity?.openid || '未找到');
    console.log('真实用户名:', realIdentity?.userInfo?.username || '未找到');
    console.log('备份时间:', realIdentity?.timestamp ? new Date(realIdentity.timestamp).toLocaleString() : '未知');
    console.log('');
    console.log('💡 结束测试: getApp().devTools.endTestMode()');
  } else {
    console.log('当前用户状态:');
    console.log('openid:', currentOpenid);
    console.log('登录状态:', userStore.loginStatus);
    console.log('用户信息:', userStore.userInfo);
  }
  
  console.log('========================================');
  
  return {
    isInTestMode,
    testOpenid,
    currentOpenid,
    realIdentity,
    userStore: {
      loginStatus: userStore.loginStatus,
      userInfo: userStore.userInfo
    }
  };
}

// ========================================
// 辅助功能
// ========================================

/**
 * 🆘 紧急恢复
 * 
 * 不清理测试数据，直接恢复真实身份
 * 使用场景：清理失败或出现错误时
 */
function emergencyRestore() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用');
    return false;
  }

  wx.showModal({
    title: '⚠️ 紧急恢复',
    content: '将不清理测试数据，直接恢复真实身份。\n\n测试数据需要手动清理。',
    confirmText: '恢复',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        restoreRealIdentity();
      }
    }
  });
}

/**
 * 🗑️ 手动清理测试用户
 * 
 * 单独调用清理功能，用于补救清理失败的情况
 */
async function manualCleanup() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用');
    return false;
  }

  const testOpenid = wx.getStorageSync(STORAGE_KEYS.TEST_OPENID);
  
  if (!testOpenid) {
    wx.showModal({
      title: '提示',
      content: '未找到测试 openid',
      showCancel: false
    });
    return false;
  }

  wx.showModal({
    title: '清理测试数据',
    content: `确定要清理测试用户吗？\n\nopenid: ${testOpenid.substr(0, 20)}...`,
    confirmText: '清理',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        await cleanupTestUser(testOpenid);
      }
    }
  });
}

// ========================================
// 内部函数
// ========================================

/**
 * 恢复真实身份（内部函数）
 */
function restoreRealIdentity() {
  try {
    const realIdentity = wx.getStorageSync(STORAGE_KEYS.REAL_IDENTITY);
    
    if (!realIdentity || !realIdentity.openid) {
      throw new Error('未找到真实身份备份');
    }

    // 恢复真实身份
    wx.setStorageSync('openid', realIdentity.openid);
    if (realIdentity.userInfo) {
      wx.setStorageSync('userInfo', realIdentity.userInfo);
    }
    
    // 清除测试标记
    wx.removeStorageSync(STORAGE_KEYS.TEST_MODE);
    wx.removeStorageSync(STORAGE_KEYS.TEST_OPENID);
    wx.removeStorageSync(STORAGE_KEYS.REAL_IDENTITY);
    
    // 更新 userStore
    const app = getApp();
    const userStore = app.getUserStore();
    userStore.checkLoginStatus();
    
    console.log('========================================');
    console.log('✅ 已恢复真实身份');
    console.log('========================================');
    console.log('真实 openid:', realIdentity.openid);
    console.log('用户名:', realIdentity.userInfo?.username || '未知');
    console.log('========================================');
    
    wx.showToast({
      title: '已恢复真实身份',
      icon: 'success',
      duration: 2000
    });

    // 刷新当前页面
    setTimeout(() => {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && currentPage.onLoad) {
        currentPage.onLoad(currentPage.options || {});
      }
    }, 500);

    return true;
  } catch (error) {
    console.error('❌ 恢复真实身份失败:', error);
    wx.showModal({
      title: '恢复失败',
      content: error.message || '无法恢复真实身份',
      showCancel: false
    });
    return false;
  }
}

/**
 * 清理测试用户（内部函数）
 * 调用后端注销接口
 */
async function cleanupTestUser(testOpenid) {
  if (!testOpenid || !testOpenid.startsWith('test_')) {
    console.error('❌ 无效的测试 openid:', testOpenid);
    return false;
  }

  try {
    console.log('🗑️ 开始清理测试用户数据...');
    console.log('测试 openid:', testOpenid);
    
    wx.showLoading({ title: '清理中...', mask: true });
    
    // 调用后端注销接口
    const { BACKEND_CONFIG } = require('../config/backend');
    const app = getApp();
    const baseUrl = app ? app.globalData.baseUrl : BACKEND_CONFIG.BASE_URL;
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${baseUrl}/wechat/delete-account`,
        method: 'DELETE',
        header: {
          'Content-Type': 'application/json',
          'x-openid': testOpenid
        },
        success: resolve,
        fail: reject
      });
    });
    
    wx.hideLoading();
    
    if (res.statusCode === 200 && res.data.success) {
      const summary = res.data.data?.summary || {};
      
      console.log('✅ 清理成功');
      console.log('清理统计:', summary);
      
      wx.showModal({
        title: '✅ 清理成功',
        content: `已清理测试用户的所有数据：\n\n` +
                 `圈子: ${summary.deletedCircles || 0} 个\n` +
                 `帖子: ${summary.deletedPosts || 0} 个\n` +
                 `评论: ${summary.deletedComments || 0} 个`,
        showCancel: false
      });
      
      return true;
    } else {
      throw new Error(res.data?.message || '清理失败');
    }
    
  } catch (error) {
    wx.hideLoading();
    console.error('❌ 清理测试数据失败:', error);
    
    wx.showModal({
      title: '清理失败',
      content: error.message || '请检查网络连接',
      showCancel: false
    });
    
    return false;
  }
}

/**
 * 清除所有本地缓存（包括 openid）
 * ⚠️ 谨慎使用！会导致需要重新获取 openid
 */
function clearAllCache() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用');
    return false;
  }

  wx.showModal({
    title: '⚠️ 警告',
    content: '确定要清除所有缓存吗？这将清除 openid，需要重新登录。',
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
          
          // 2秒后重启
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/main/main' });
          }, 2000);
        } catch (error) {
          console.error('❌ 清除缓存失败:', error);
        }
      }
    }
  });
}

/**
 * 将开发者工具挂载到全局
 */
function installDevTools(appInstance) {
  if (!DEV_MODE) {
    return;
  }

  if (!appInstance) {
    console.error('❌ installDevTools: appInstance 为空');
    return;
  }
  
  // 挂载到 app.devTools
  appInstance.devTools = {
    // 🎭 核心功能
    startTestMode,
    endTestMode,
    getTestStatus,
    
    // 🆘 辅助功能
    emergencyRestore,
    manualCleanup,
    
    // ⚠️ 其他工具
    clearAllCache
  };
  
  console.log('========================================');
  console.log('🛠️  开发者工具已启用');
  console.log('========================================');
  console.log('📖 使用指南：');
  console.log('');
  console.log('🎭 测试注册流程：');
  console.log('  1. 开始测试:');
  console.log('     getApp().devTools.startTestMode()');
  console.log('  2. 测试注册、加入朋友圈等功能...');
  console.log('  3. 结束测试（自动清理）:');
  console.log('     getApp().devTools.endTestMode()');
  console.log('');
  console.log('📊 查看状态：');
  console.log('  getApp().devTools.getTestStatus()');
  console.log('');
  console.log('🆘 紧急恢复（不清理）：');
  console.log('  getApp().devTools.emergencyRestore()');
  console.log('');
  console.log('🗑️ 手动清理测试数据：');
  console.log('  getApp().devTools.manualCleanup()');
  console.log('========================================');
}

module.exports = {
  DEV_MODE,
  startTestMode,
  endTestMode,
  getTestStatus,
  emergencyRestore,
  manualCleanup,
  clearAllCache,
  installDevTools
};
