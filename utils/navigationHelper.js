/**
 * 导航栏信息工具
 */
const navigationHelper = {
  /**
   * 获取导航栏信息
   * @returns {Object} 导航栏信息对象
   */
  getNavigationInfo() {
    const systemInfo = wx.getSystemInfoSync();
    const screenWidth = systemInfo.windowWidth;
    
    const menuInfo = wx.getMenuButtonBoundingClientRect();
    
    return {
      menuHeight: menuInfo.height,
      menuTop: menuInfo.top,
      menuLeft: screenWidth - menuInfo.left,
      menuRight: screenWidth - menuInfo.right
    };
  }
};

module.exports = navigationHelper;