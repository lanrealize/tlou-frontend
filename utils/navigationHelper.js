/**
 * 简化的自定义导航栏工具
 */
class NavigationHelper {
  /**
   * 获取导航栏数据
   * @returns {Object} 导航栏样式数据
   */
  getNavigationData() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      
      const statusBarHeight = systemInfo.statusBarHeight || 44;
      const navigationBarHeight = 44;
      const totalHeight = statusBarHeight + navigationBarHeight;
      
      // 胶囊按钮垂直居中位置
      const capsuleTop = menuButton.top - statusBarHeight;
      const capsuleHeight = menuButton.height || 32;
      const capsuleCenter = capsuleTop + capsuleHeight / 2;
      
      return {
        statusBarHeight,
        navigationBarHeight,
        totalNavigationHeight: totalHeight,
        capsuleVerticalCenter: capsuleCenter
      };
    } catch (error) {
      console.error('获取导航栏数据失败:', error);
      // 降级方案
      return {
        statusBarHeight: 44,
        navigationBarHeight: 44,
        totalNavigationHeight: 88,
        capsuleVerticalCenter: 22
      };
    }
  }
}

// 创建单例实例
const navigationHelper = new NavigationHelper();

module.exports = navigationHelper;