// utils/navigationLogger.js
/**
 * 🔍 导航日志工具 - 用于调试页面导航问题
 */

// 存储原始的导航方法
const originalNavigateTo = wx.navigateTo;
const originalRedirectTo = wx.redirectTo;
const originalReLaunch = wx.reLaunch;
const originalSwitchTab = wx.switchTab;

/**
 * 包装导航方法，添加参数验证和日志
 */
function wrapNavigateMethod(methodName, originalMethod) {
  return function(options) {
    console.log(`🧭 [${methodName}] 导航调用:`, options);
    
    // 验证 URL 参数
    if (!options || !options.url) {
      console.error(`❌ [${methodName}] URL 参数缺失或为空!`, options);
      console.error('   → 调用栈:', new Error().stack);
      
      // 阻止导航到空页面
      if (options && options.fail) {
        options.fail({ errMsg: `${methodName}:fail url is required` });
      }
      return;
    }
    
    // 检查 URL 是否为空字符串
    if (options.url === '') {
      console.error(`❌ [${methodName}] URL 为空字符串!`);
      console.error('   → 调用栈:', new Error().stack);
      
      if (options.fail) {
        options.fail({ errMsg: `${methodName}:fail url is empty` });
      }
      return;
    }
    
    // 检查 URL 格式
    if (!options.url.startsWith('/pages/')) {
      console.warn(`⚠️ [${methodName}] URL 格式可能不正确:`, options.url);
    }
    
    console.log(`✅ [${methodName}] 参数验证通过，执行导航`);
    
    // 调用原始方法
    return originalMethod.call(wx, options);
  };
}

/**
 * 启用导航日志（在 app.js onLaunch 中调用）
 */
function enable() {
  console.log('🔍 导航日志工具已启用');
  
  wx.navigateTo = wrapNavigateMethod('navigateTo', originalNavigateTo);
  wx.redirectTo = wrapNavigateMethod('redirectTo', originalRedirectTo);
  wx.reLaunch = wrapNavigateMethod('reLaunch', originalReLaunch);
  wx.switchTab = wrapNavigateMethod('switchTab', originalSwitchTab);
}

/**
 * 禁用导航日志（恢复原始方法）
 */
function disable() {
  console.log('🔍 导航日志工具已禁用');
  
  wx.navigateTo = originalNavigateTo;
  wx.redirectTo = originalRedirectTo;
  wx.reLaunch = originalReLaunch;
  wx.switchTab = originalSwitchTab;
}

module.exports = {
  enable,
  disable
};

