/**
 * 系统信息工具 - 统一管理所有系统信息获取
 */
const navigationHelper = {
  /**
   * 获取窗口信息
   * @returns {Object} 窗口信息对象
   */
  getWindowInfo() {
    return wx.getWindowInfo();
  },

  /**
   * 获取导航栏信息
   * @returns {Object} 导航栏信息对象
   */
  getNavigationInfo() {
    const windowInfo = this.getWindowInfo();
    const screenWidth = windowInfo.windowWidth;
    
    const menuInfo = wx.getMenuButtonBoundingClientRect();
    
    return {
      menuHeight: menuInfo.height,
      menuTop: menuInfo.top,
      menuLeft: screenWidth - menuInfo.left,
      menuRight: screenWidth - menuInfo.right,
      screenWidth: screenWidth
    };
  },

  /**
   * 获取安全区域信息
   * @returns {Object} 安全区域信息对象
   */
  getSafeAreaInfo() {
    const windowInfo = this.getWindowInfo();
    return {
      safeAreaBottom: windowInfo.safeArea.bottom,
      screenHeight: windowInfo.screenHeight,
      bottomSafeArea: windowInfo.screenHeight - windowInfo.safeArea.bottom
    };
  },

  /**
   * 获取完整的系统信息（用于app初始化）
   * @returns {Object} 系统信息对象
   */
  getFullSystemInfo() {
    const windowInfo = this.getWindowInfo();
    const { statusBarHeight, safeArea, windowHeight } = windowInfo;
    
    // 智能默认值：优先使用系统值，失败时使用安全默认值
    // 44px 是基于 iPhone X 系列的安全值，比大部分设备的实际值都大，避免内容被遮挡
    const safeStatusBarHeight = statusBarHeight || 44;
    const navigationBarHeight = 44; // 微信小程序标准导航栏高度
    
    return {
      windowInfo: windowInfo, // 原始窗口信息
      statusBarHeight: safeStatusBarHeight,
      navBarHeight: safeStatusBarHeight + navigationBarHeight,
      safeAreaTop: safeArea?.top || safeStatusBarHeight,
      safeAreaBottom: safeArea?.bottom || windowHeight,
      windowHeight: windowHeight
    };
  }
};

module.exports = navigationHelper;