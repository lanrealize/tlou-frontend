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

  // 初始化状态跟踪
  _initPromise: null,
  _initCompleted: false,
  _pagesReady: false,  // 页面注册完成标记
  _pageRegistrationPromise: null,  // 页面注册 Promise
  _pageRegistrationResolve: null,  // 页面注册 resolve

  onLaunch() {
    console.log('🚀 小程序启动');
    
    // 🔧 创建页面注册等待 Promise（修复热重载白屏）
    this._pageRegistrationPromise = new Promise(resolve => {
      this._pageRegistrationResolve = resolve;
    });
    
    // 设置导航栏信息
    this.setNavigationInfo();
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 初始化应用（统一入口）- 保存Promise供页面等待
    this._initPromise = this.initializeApp();
    
    // 🛠️ 启用开发者工具（仅开发环境）
    this.initDevTools();
  },

  async onShow() {
    console.log('👁️ 小程序显示');
    
    // 🔧 修复热重载白屏：等待首页注册完成
    // 热重载时 onShow 会在页面注册前触发，导致导航失败
    if (!this._pagesReady) {
      await this._pageRegistrationPromise;
      this._pagesReady = true;
    }
  },
  
  // 🔧 页面注册完成通知（由 main.js 调用，修复热重载白屏）
  notifyMainPageRegistered() {
    if (this._pageRegistrationResolve) {
      this._pageRegistrationResolve();
      this._pageRegistrationResolve = null;
    }
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

  // 初始化应用（统一入口）
  // 用于：
  // 1. 小程序首次启动
  // 2. 测试模式结束后恢复状态
  async initializeApp() {
    console.log('🔄 初始化应用');
    
    try {
      // 初始化用户状态（从 Storage 加载到 MobX）
      await userStore.initializeFromStorage();
      
      this._initCompleted = true;
      console.log('✅ 应用初始化完成');
    } catch (error) {
      console.error('❌ 应用初始化失败:', error);
      this._initCompleted = true; // 即使失败也标记完成，避免页面永久等待
      throw error;
    }
  },

  // 等待应用初始化完成（供页面调用）
  async waitForInit() {
    if (this._initCompleted) {
      return;
    }
    if (this._initPromise) {
      await this._initPromise;
    }
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

  // 重新初始化用户状态（便捷方法）
  reinitializeUserState() {
    console.log('🔄 重新初始化用户状态');
    userStore.initializeFromStorage();
  },

  // 触发用户信息弹出层
  showUserInfoPopup(options = {}) {
    console.log('📝 触发用户信息弹出层', options);
    // 保存弹出层配置到全局数据
    this.globalData.userInfoPopupConfig = {
      visible: true,
      rejectReason: options.reason || options.loginMessage || '',
      pendingIntent: options.intent || options.intentType || '',
      circleId: options.circleId || '',
      timestamp: Date.now()
    };
    
    // 触发全局事件（通过 wx.eventChannel 或自定义事件系统）
    // 页面需要监听此事件来显示弹出层
    if (this.userInfoPopupCallback) {
      this.userInfoPopupCallback(this.globalData.userInfoPopupConfig);
    }
  },

  // 注册用户信息弹出层回调
  registerUserInfoPopupCallback(callback) {
    this.userInfoPopupCallback = callback;
  },

  // 清除用户信息弹出层配置
  clearUserInfoPopupConfig() {
    this.globalData.userInfoPopupConfig = null;
  },

  // 🛠️ 初始化开发者工具
  initDevTools() {
    const devTools = require('./utils/devTools');
    if (devTools.DEV_MODE) {
      // 传入 this (App 实例) 避免 onLaunch 时 getApp() 返回 undefined
      devTools.installDevTools(this);
    }
  }
});