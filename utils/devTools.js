// utils/devTools.js
// 开发者工具：用于测试不同的用户状态

/**
 * 开发者模式配置
 * 在开发时设置为 true，生产环境设置为 false
 */
const DEV_MODE = true; // ⚠️ 生产环境请改为 false

/**
 * 判断是否在测试模式
 */
function isTestMode() {
  const openid = wx.getStorageSync('openid');
  return openid && openid.startsWith('test_');
}

// ========================================
// 核心功能 - 优雅简洁的设计
// ========================================

/**
 * 🎭 开始测试模式
 * 
 * 设计原则：
 * - 不保存真实用户数据（避免备份丢失问题）
 * - 只清理当前状态，生成测试身份
 * - 结束时触发重新初始化即可
 * 
 * 功能：
 * 1. 生成测试 openid
 * 2. 清除 userInfo（切换到未注册状态）
 * 3. 标记测试模式
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
    if (isTestMode()) {
      console.warn('⚠️ 当前已在测试模式');
      wx.showToast({
        title: '已在测试模式',
        icon: 'none',
        duration: 2000
      });
      return false;
    }

    // 2. 生成测试 openid
    const testOpenid = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 3. Storage 操作：写入测试 openid，删除用户信息
    wx.setStorageSync('openid', testOpenid);
    wx.removeStorageSync('userInfo');
    
    // 4. 更新 userStore
    const app = getApp();
    const userStore = app.getUserStore();
    const { USER_STATUS } = require('../store/userStore');
    userStore.setStatus(USER_STATUS.UNREGISTERED, {});

    // 5. 重置 circleStore（避免测试用户看到真实用户数据）
    const { circleStore } = require('../store/circleStore');
    if (circleStore) circleStore.reset();
    
    console.log('========================================');
    console.log('🎭 测试模式已开启');
    console.log('========================================');
    console.log('测试 openid:', testOpenid);
    console.log('💡 可以开始测试注册流程了');
    console.log('💡 测试完成后请调用: getApp().devTools.endTestMode()');
    console.log('========================================');
    
    return true;
  } catch (error) {
    console.error('❌ 开启测试模式失败:', error);
    return false;
  }
}

/**
 * 💪 强制开始测试模式
 * 
 * 与 startTestMode() 的区别：
 * - 即使已在测试模式，也会先清理旧的测试数据，再创建新的测试身份
 * - 适用于需要快速重置测试环境的场景
 * 
 * 功能：
 * 1. 如果已在测试模式，先清理旧的测试数据
 * 2. 生成新的测试 openid
 * 3. 重置所有状态
 * 
 * 使用场景：
 * - 快速重置测试环境
 * - 连续测试多个场景
 * - 测试状态异常时强制重新开始
 */
async function forceStartTestMode() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用');
    return false;
  }

  try {
    console.log('========================================');
    console.log('💪 强制开始测试模式');
    console.log('========================================');

    // 1. 如果已在测试模式，先清理旧的测试数据
    if (isTestMode()) {
      const oldTestOpenid = wx.getStorageSync('openid');
      console.log('🗑️ 检测到旧的测试身份，先清理...');
      console.log('旧测试 openid:', oldTestOpenid);
      
      // 清理后端数据（不等待结果，继续执行）
      cleanupTestUser(oldTestOpenid).catch(err => {
        console.warn('⚠️ 清理旧测试数据失败（已忽略）:', err);
      });
    }

    // 2. 生成新的测试 openid
    const testOpenid = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 3. Storage 操作：写入测试 openid，删除用户信息
    wx.setStorageSync('openid', testOpenid);
    wx.removeStorageSync('userInfo');
    
    // 4. 更新 userStore
    const app = getApp();
    const userStore = app.getUserStore();
    const { USER_STATUS } = require('../store/userStore');
    userStore.setStatus(USER_STATUS.UNREGISTERED, {});

    // 5. 重置 circleStore（避免测试用户看到真实用户数据）
    const { circleStore } = require('../store/circleStore');
    if (circleStore) circleStore.reset();
    
    console.log('✅ 新测试身份已创建');
    console.log('测试 openid:', testOpenid);
    console.log('💡 可以开始测试注册流程了');
    console.log('💡 测试完成后请调用: getApp().devTools.endTestMode()');
    console.log('========================================');
    
    wx.showToast({
      title: '测试模式已重置',
      icon: 'success',
      duration: 2000
    });
    
    return true;
  } catch (error) {
    console.error('❌ 强制开启测试模式失败:', error);
    return false;
  }
}

/**
 * 🔙 结束测试模式
 * 
 * 设计原则：
 * - 不依赖备份恢复（更鲁棒）
 * - 只清理测试状态
 * - 触发重新初始化
 * 
 * 功能：
 * 1. 清理后端测试用户数据
 * 2. 清除本地测试状态（openid、userInfo）
 * 3. 触发重新初始化（复用app.onLaunch逻辑）
 * 
 * 优势：
 * - 无需保存真实用户数据
 * - 状态清理更彻底
 * - 初始化逻辑统一
 * - 职责单一：专注于清理
 */
async function endTestMode() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用');
    return { success: false, cleanupSuccess: false, statusCode: 0, error: '开发者模式未启用' };
  }

  try {
    console.log('========================================');
    console.log('🔄 开始退出测试模式');
    console.log('========================================');

    // 1. 检查是否在测试模式
    if (!isTestMode()) {
      console.log('⚠️ 当前不在测试模式');
      return { success: false, cleanupSuccess: false, statusCode: 0, error: '当前不在测试模式' };
    }
    
    // 2. 获取测试 openid（用于清理后端数据）
    const testOpenid = wx.getStorageSync('openid');

    // 3. 清理后端测试数据
    let cleanupResult = { success: false, statusCode: 0, error: '' };
    console.log('🗑️ 清理后端测试用户数据...');
    try {
      cleanupResult = await cleanupTestUser(testOpenid);
      if (cleanupResult.success) {
        console.log('✅ 后端测试数据清理成功');
      } else {
        console.warn('⚠️ 后端测试数据清理失败');
        console.warn(`   状态码: ${cleanupResult.statusCode}`);
        console.warn(`   错误: ${cleanupResult.error}`);
      }
    } catch (error) {
      console.warn('⚠️ 后端清理异常:', error);
      cleanupResult = { success: false, statusCode: 0, error: error.message || '未知异常' };
      // 继续清理本地状态
    }

    // 4. Storage 操作：清空所有认证数据
    console.log('🧹 清理 Storage...');
    wx.removeStorageSync('openid');
    wx.removeStorageSync('userInfo');
    console.log('✅ Storage 已清空');

    // 5. 触发重新初始化（复用 app.onLaunch 逻辑）
    console.log('🔄 触发重新初始化...');
    const app = getApp();

    // 重置 circleStore（避免真实用户看到测试用户数据）
    const { circleStore } = require('../store/circleStore');
    if (circleStore) circleStore.reset();

    // 重置初始化状态
    app._initCompleted = false;
    
    // 重新执行初始化逻辑并保存Promise
    if (app.initializeApp) {
      app._initPromise = app.initializeApp();
      await app._initPromise;
      console.log('✅ 应用重新初始化完成');
    } else {
      console.warn('⚠️ 未找到initializeApp方法，请手动刷新页面');
    }
    
    wx.showToast({
      title: '已恢复真实身份',
      icon: 'success',
      duration: 2000
    });
    
    console.log('========================================');
    console.log('✅ 测试模式已结束');
    console.log('💡 应用已恢复到真实用户状态');
    console.log('========================================');
    
    return { 
      success: true, 
      cleanupSuccess: cleanupResult.success,
      statusCode: cleanupResult.statusCode,
      error: cleanupResult.error
    };

  } catch (error) {
    console.error('❌ 结束测试模式失败:', error);
    
    // 紧急清理：无论如何都要清除测试数据
    try {
      console.log('🆘 执行紧急清理...');
      wx.removeStorageSync('openid');
      wx.removeStorageSync('userInfo');
      console.log('✅ 紧急清理完成，请手动刷新页面');
    } catch (cleanupError) {
      console.error('❌ 紧急清理失败:', cleanupError);
    }
    
    return { success: false, cleanupSuccess: false, statusCode: 0, error: error.message || '未知错误' };
  }
}

/**
 * 📊 获取测试状态
 * 
 * 返回当前测试模式的详细信息
 */
function getTestStatus() {
  const inTestMode = isTestMode();
  const currentOpenid = wx.getStorageSync('openid');
  
  const app = getApp();
  const userStore = app.getUserStore();
  
  console.log('========================================');
  console.log('📊 测试状态');
  console.log('========================================');
  console.log('是否在测试模式:', inTestMode ? '是 ✅' : '否');
  console.log('');
  
  if (inTestMode) {
    console.log('🎭 测试模式详情:');
    console.log('测试 openid:', currentOpenid);
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
    isInTestMode: inTestMode,
    currentOpenid,
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
 * 🆘 紧急清理
 * 
 * 清除所有测试相关状态，强制退出测试模式
 * 使用场景：测试状态异常时
 */
function emergencyCleanup() {
  if (!DEV_MODE) {
    console.warn('⚠️ 开发者模式未启用');
    return false;
  }

  wx.showModal({
    title: '🆘 紧急清理',
    content: '将清除所有测试状态\n建议先调用 endTestMode() 正常退出',
    confirmText: '强制清理',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        try {
          // 清除所有测试数据
          wx.removeStorageSync('openid');
          wx.removeStorageSync('userInfo');
          
          console.log('✅ 紧急清理完成');
          console.log('💡 请刷新页面重新获取真实身份');
          
          wx.showToast({
            title: '清理完成\n请刷新页面',
            icon: 'none',
            duration: 3000
          });
        } catch (error) {
          console.error('❌ 紧急清理失败:', error);
        }
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

  if (!isTestMode()) {
    wx.showModal({
      title: '提示',
      content: '当前不在测试模式',
      showCancel: false
    });
    return false;
  }

  const testOpenid = wx.getStorageSync('openid');

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
// 内部函数（已废弃，保留仅用于向后兼容）
// ========================================

/**
 * 清理测试用户（内部函数）
 * 调用后端注销接口
 */
async function cleanupTestUser(testOpenid) {
  if (!testOpenid || !testOpenid.startsWith('test_')) {
    console.error('❌ 无效的测试 openid:', testOpenid);
    return { success: false, statusCode: 0, error: '无效的测试 openid' };
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
    
    // ✅ 处理成功的情况
    if (res.statusCode === 200 && res.data.success) {
      const summary = res.data.data?.summary || {};
      
      console.log('✅ 清理成功，统计:', summary);
      console.log(`   圈子: ${summary.deletedCircles || 0} 个`);
      console.log(`   帖子: ${summary.deletedPosts || 0} 个`);
      console.log(`   评论: ${summary.deletedComments || 0} 个`);
      
      // 不弹窗，只在控制台记录
      return { success: true, statusCode: 200, error: '' };
    } 
    // ✅ 处理 401 的情况（用户不存在）
    else if (res.statusCode === 401) {
      console.log('ℹ️  测试用户不存在（可能未注册），无需清理');
      console.log('   这是正常情况，例如测试未登录状态时');
      // 返回 true 表示"清理成功"（因为用户本来就不存在）
      return { success: true, statusCode: 401, error: '用户不存在' };
    } 
    // ❌ 其他错误情况
    else {
      const errorMsg = res.data?.message || `HTTP ${res.statusCode}: 清理失败`;
      console.error('❌ 后端返回错误:', errorMsg);
      console.error('   状态码:', res.statusCode);
      console.error('   响应数据:', res.data);
      return { success: false, statusCode: res.statusCode, error: errorMsg };
    }
    
  } catch (error) {
    wx.hideLoading();
    console.error('❌ 清理测试数据失败:', error);
    console.error('   原因:', error.message || '未知');
    
    // 不弹窗，只在控制台记录错误
    // 返回详细错误信息
    return { success: false, statusCode: 0, error: error.message || '网络请求失败' };
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
    forceStartTestMode,
    endTestMode,
    getTestStatus,
    
    // 🆘 辅助功能
    emergencyCleanup,
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
  console.log('  2. 强制重新开始（即使已在测试模式）:');
  console.log('     await getApp().devTools.forceStartTestMode()');
  console.log('  3. 测试注册、加入朋友圈等功能...');
  console.log('  4. 结束测试（自动清理并恢复真实身份）:');
  console.log('     await getApp().devTools.endTestMode()');
  console.log('');
  console.log('📊 查看状态：');
  console.log('  getApp().devTools.getTestStatus()');
  console.log('');
  console.log('🆘 紧急清理（强制清除测试状态）：');
  console.log('  getApp().devTools.emergencyCleanup()');
  console.log('');
  console.log('🗑️ 手动清理后端测试数据：');
  console.log('  await getApp().devTools.manualCleanup()');
  console.log('========================================');
}

module.exports = {
  DEV_MODE,
  startTestMode,
  forceStartTestMode,
  endTestMode,
  getTestStatus,
  emergencyCleanup,
  manualCleanup,
  clearAllCache,
  installDevTools
};
