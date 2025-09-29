// app.js
const { userStore } = require('./store/userStore');
const { BACKEND_CONFIG } = require('./config/backend');

App({
  globalData: {
    // 后端API基础地址
    baseUrl: BACKEND_CONFIG.BASE_URL,
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
    
    // 检查网络状态
    this.checkNetworkStatus();
    
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
    const navigationHelper = require('./utils/navigationHelper');
    const navigationInfo = navigationHelper.getNavigationInfo();
    
    this.globalData.navigationInfo.menuHeight = navigationInfo.menuHeight;
    this.globalData.navigationInfo.menuTop = navigationInfo.menuTop;
    this.globalData.navigationInfo.menuLeft = navigationInfo.menuLeft;
    this.globalData.navigationInfo.menuRight = navigationInfo.menuRight;
  },

  // 获取系统信息
  getSystemInfo() {
    try {
      const navigationHelper = require('./utils/navigationHelper');
      const systemInfo = navigationHelper.getFullSystemInfo();
      
      this.globalData.systemInfo = systemInfo.windowInfo; // 保持原有数据结构兼容性
      this.globalData.safeAreaInfo = {
        statusBarHeight: systemInfo.statusBarHeight,
        navBarHeight: systemInfo.navBarHeight,
        safeAreaTop: systemInfo.safeAreaTop,
        safeAreaBottom: systemInfo.safeAreaBottom,
        windowHeight: systemInfo.windowHeight
      };
      
      console.log('系统信息获取成功:', systemInfo.windowInfo);
      console.log('安全区域信息:', this.globalData.safeAreaInfo);
    } catch (err) {
      console.error('获取系统信息失败:', err);
      // 设置默认值
      this.globalData.safeAreaInfo = {
        statusBarHeight: 44,
        navBarHeight: 88,
        safeAreaTop: 44,
        safeAreaBottom: 812,
        windowHeight: 812
      };
    }
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
  },

  // 检查网络状态
  checkNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        const networkType = res.networkType;
        console.log('🌐 当前网络类型:', networkType);
        
        if (networkType === 'none') {
          // 无网络连接
          setTimeout(() => {
            wx.showModal({
              title: '网络连接异常',
              content: '当前无网络连接，请检查网络设置后重新启动应用',
              showCancel: false,
              confirmText: '知道了'
            });
          }, 1000);
        } else if (networkType === '2g') {
          // 2G网络提醒
          setTimeout(() => {
            wx.showToast({
              title: '网络较慢，加载可能需要更长时间',
              icon: 'none',
              duration: 3000
            });
          }, 1000);
        }
        
        // 监听网络状态变化
        wx.onNetworkStatusChange((res) => {
          console.log('🌐 网络状态变化:', res);
          if (!res.isConnected) {
            wx.showToast({
              title: '网络连接已断开',
              icon: 'none',
              duration: 2000
            });
          } else if (res.networkType !== 'none') {
            wx.showToast({
              title: '网络已连接',
              icon: 'success',
              duration: 1500
            });
          }
        });
      },
      fail: (error) => {
        console.error('获取网络状态失败:', error);
      }
    });
  }
});