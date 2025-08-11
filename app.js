// app.js
const { userStore } = require('./store/userStore');

App({
  globalData: {
    // 后端API基础地址
    baseUrl: 'http://localhost:3000/api',
    // MobX用户状态管理
    userStore: userStore,
    // 系统信息
    systemInfo: null,
    // 导航栏信息
    navigationInfo: {
      menuHeight: 0,
      menuTop: 0,
      menuLeft: 0,
      menuRight: 0
    },
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44,
      navBarHeight: 88,
      safeAreaTop: 44,
      safeAreaBottom: 0,
      windowHeight: 667
    }
  },

  onLaunch() {
    console.log('🚀 小程序启动');
    
    // 设置导航栏信息
    this.setNavigationInfo();
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查用户登录状态（使用MobX状态管理）
    this.initUserState();
  },

  onShow() {
    console.log('👁️ 小程序显示');
  },

  onHide() {
    console.log('🫥 小程序隐藏');
  },

  onError(msg) {
    console.error('小程序错误:', msg);
  },

  // 设置导航栏信息
  setNavigationInfo() {
    const systemInfo = wx.getSystemInfoSync();
    const screenWidth = systemInfo.windowWidth; 

    const menuInfo = wx.getMenuButtonBoundingClientRect();
    this.globalData.navigationInfo.menuHeight = menuInfo.height;
    this.globalData.navigationInfo.menuTop = menuInfo.top;
    this.globalData.navigationInfo.menuLeft = screenWidth - menuInfo.left;
    this.globalData.navigationInfo.menuRight = screenWidth - menuInfo.right;
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
        
        // 计算安全区域信息（用于自定义导航栏）
        const { statusBarHeight, safeArea, windowHeight } = res;
        
        this.globalData.safeAreaInfo = {
          statusBarHeight: statusBarHeight || 44, // 状态栏高度
          navBarHeight: (statusBarHeight || 44) + 44, // 导航栏总高度（状态栏+导航栏）
          safeAreaTop: safeArea?.top || statusBarHeight || 44,
          safeAreaBottom: safeArea?.bottom || windowHeight,
          windowHeight: windowHeight
        };
        

      }
    });
  },

  // 初始化用户状态（使用MobX状态管理）
  async initUserState() {
    console.log('🔧 初始化用户状态管理');
    
    // 检查用户登录状态
    await userStore.checkLoginStatus();
  },

  // 获取用户状态管理器（对外接口）
  getUserStore() {
    return userStore;
  },

  // 触发用户注册（便捷方法）
  async triggerUserRegistration() {
    console.log('🎯 触发用户注册流程');
    await userStore.performUserRegistration();
  },

  // 退出登录（便捷方法）
  logout() {
    console.log('👋 执行退出登录');
    userStore.logout();
  },

  // 重新检查登录状态（便捷方法）
  recheckLoginStatus() {
    console.log('🔄 重新检查用户登录状态');
    userStore.checkLoginStatus();
  }
});