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
    
    return {
      windowInfo: windowInfo, // 原始窗口信息
      statusBarHeight: statusBarHeight || 44,
      navBarHeight: (statusBarHeight || 44) + 44,
      safeAreaTop: safeArea?.top || statusBarHeight || 44,
      safeAreaBottom: safeArea?.bottom || windowHeight,
      windowHeight: windowHeight
    };
  }
};

module.exports = navigationHelper;