// jest.setup.js
// 微信小程序测试环境初始化

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
  
  // 系统信息
  getSystemInfo: jest.fn(),
  
  // 其他常用API
  setClipboardData: jest.fn(),
  getLocation: jest.fn(),
  showShareMenu: jest.fn(),
  stopPullDownRefresh: jest.fn()
};

// 模拟getApp()函数
global.getApp = jest.fn(() => ({
  globalData: {
    baseUrl: 'http://localhost:3000/api',
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