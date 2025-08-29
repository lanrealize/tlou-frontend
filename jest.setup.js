// jest.setup.js
// 微信小程序测试环境初始化

// 处理SharedArrayBuffer警告（仅在测试环境中）
if (typeof globalThis !== 'undefined' && globalThis.SharedArrayBuffer) {
  // SharedArrayBuffer警告不影响小程序运行，静默处理
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && args[0].includes && args[0].includes('SharedArrayBuffer')) {
      return; // 忽略SharedArrayBuffer相关警告
    }
    originalWarn.apply(console, args);
  };
}

// 模拟微信小程序全局对象
global.__wxConfig = {
  envVersion: 'develop',
  platform: 'devtools'
};

// 模拟微信小程序API
global.wx = {
  // 网络请求
  request: jest.fn(),
  
  // 数据存储
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(() => ({})),
  removeStorageSync: jest.fn(),
  setStorage: jest.fn(),
  getStorage: jest.fn(),
  removeStorage: jest.fn(),
  
  // 界面交互
  showToast: jest.fn(),
  showModal: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showActionSheet: jest.fn(),
  
  // 导航相关
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  redirectTo: jest.fn(),
  switchTab: jest.fn(),
  reLaunch: jest.fn(),
  
  // 登录相关
  login: jest.fn(),
  getUserInfo: jest.fn(),
  
  // 媒体相关
  chooseImage: jest.fn(),
  chooseMedia: jest.fn(),
  previewImage: jest.fn(),
  
  // 系统信息 - 使用新的API
  getWindowInfo: jest.fn(() => ({
    windowWidth: 375,
    windowHeight: 667,
    screenWidth: 375,
    screenHeight: 667,
    statusBarHeight: 44,
    safeArea: {
      top: 44,
      bottom: 623,
      left: 0,
      right: 375,
      width: 375,
      height: 579
    }
  })),
  getSystemSetting: jest.fn(),
  getAppAuthorizeSetting: jest.fn(),
  getDeviceInfo: jest.fn(),
  getAppBaseInfo: jest.fn(),
  
  // 保留旧API的模拟以兼容性
  getSystemInfo: jest.fn(),
  getMenuButtonBoundingClientRect: jest.fn(() => ({
    width: 87,
    height: 32,
    top: 48,
    right: 365,
    bottom: 80,
    left: 278
  })),
  
  // 其他常用API
  setClipboardData: jest.fn(),
  getLocation: jest.fn(),
  showShareMenu: jest.fn(),
  stopPullDownRefresh: jest.fn()
};

// 模拟getApp()函数
global.getApp = jest.fn(() => ({
  globalData: {
    baseUrl: 'http://192.168.0.111:3000/api',
    userStore: {},
    loginStatus: 'unregistered',
    userInfo: null,
    safeAreaInfo: {
      statusBarHeight: 44,
      navBarHeight: 88,
      safeAreaTop: 44,
      safeAreaBottom: 0,
      windowHeight: 667
    }
  },
  getUserStore: jest.fn(() => ({
    loginStatus: 'unregistered',
    userInfo: null,
    isLoggedIn: false,
    checkLoginStatus: jest.fn(),
    performUserRegistration: jest.fn(),
    logout: jest.fn()
  }))
}));

// 模拟getCurrentPages()函数
global.getCurrentPages = jest.fn(() => []);

// 模拟Component构造器
global.Component = jest.fn((options) => options);

// 模拟Page构造器
global.Page = jest.fn((options) => options);

// 模拟App构造器
global.App = jest.fn((options) => options);

// 模拟module对象
global.module = {
  exports: {}
};

// 模拟require函数（简单版本）
global.require = jest.fn();

// 清理函数，在每个测试后调用
afterEach(() => {
  jest.clearAllMocks();
});