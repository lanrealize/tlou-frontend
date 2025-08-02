const { observable, action } = require('mobx-miniprogram');
const { checkLoginStatus, registerUser } = require('../utils/auth');

// 🎯 状态常量定义
const USER_STATUS = {
  LOGGEDIN: 'loggedIn',
  ERROR: 'error', 
  UNREGISTERED: 'unregistered'
};

// 用户状态管理Store
const userStore = observable({
  // 🔥 核心状态数据
  loginStatus: USER_STATUS.UNREGISTERED,
  userInfo: null,
  errorMessage: '',
  isLoading: false,

  // 🎯 统一状态更新接口
  setStatus(status, data = {}) {
    console.log(`🔄 状态变更: ${this.loginStatus} → ${status}`, data);
    
    this.loginStatus = status;
    this.isLoading = false;
    
    switch (status) {
      case USER_STATUS.LOGGEDIN:
        this.userInfo = data.userInfo;
        this.errorMessage = '';
        this._syncToStorage(data.userInfo);
        this._syncToGlobal(status, data.userInfo);
        console.log('✅ 已登录:', data.userInfo?.username);
        // 调试：检查用户信息结构
        console.log('🔍 用户信息结构检查:', {
          hasId: !!data.userInfo?._id,
          hasOpenid: !!data.userInfo?.openid,
          userId: data.userInfo?._id,
          userOpenid: data.userInfo?.openid,
          allFields: Object.keys(data.userInfo || {})
        });
        break;
        
      case USER_STATUS.ERROR:
        this.userInfo = null;
        this.errorMessage = data.message || '发生错误';
        this._syncToGlobal(status, null);
        console.error('❌ 错误状态:', this.errorMessage);
        break;
        
      case USER_STATUS.UNREGISTERED:
        this.userInfo = null;
        this.errorMessage = data.message || '';
        this._syncToGlobal(status, null);
        console.log('👻 未注册状态');
        break;
    }
  },

  // 🔧 设置加载状态
  setLoading(isLoading, message = '') {
    this.isLoading = isLoading;
    this.errorMessage = message;
    console.log(isLoading ? '🔄 开始加载...' : '⏹️ 加载完成');
  },

  // 📋 核心业务方法
  
  async checkLoginStatus() {
    this.setLoading(true, '检查登录状态...');
    
    try {
      const result = await checkLoginStatus();
      
      if (result.status === 'loggedIn') {
        this.setStatus(USER_STATUS.LOGGEDIN, { userInfo: result.userInfo });
      } else if (result.status === 'unregistered') {
        this.setStatus(USER_STATUS.UNREGISTERED);
      } else {
        this.setStatus(USER_STATUS.ERROR, { message: result.message || '登录检查失败' });
      }
    } catch (error) {
      this.setStatus(USER_STATUS.ERROR, { message: error.message || '网络异常' });
    }
  },

  async performUserRegistration() {
    if (this.isLoading) return;
    
    this.setLoading(true, '执行注册流程...');
    
    try {
      const result = await registerUser();
      
      if (result.status === 'redirected') {
        this.setLoading(false); // 等待用户在userInfo页面完成注册
      } else if (result.status === 'loggedIn') {
        this.setStatus(USER_STATUS.LOGGEDIN, { userInfo: result.userInfo });
        wx.showToast({ title: '注册成功！', icon: 'success' });
      } else {
        this.setStatus(USER_STATUS.ERROR, { message: result.reason || '注册失败' });
        wx.showToast({ title: this.errorMessage, icon: 'error' });
      }
    } catch (error) {
      this.setStatus(USER_STATUS.ERROR, { message: error.message || '注册异常' });
      wx.showToast({ title: '注册失败，请重试', icon: 'error' });
    }
  },

  logout() {
    console.log('👋 用户退出登录');
    
    // 清除本地存储
    wx.removeStorageSync('openid');
    wx.removeStorageSync('userInfo');
    
    this.setStatus(USER_STATUS.UNREGISTERED);
    wx.showToast({ title: '已退出登录', icon: 'success' });
  },

  updateUserInfo(newUserInfo) {
    if (this.loginStatus === USER_STATUS.LOGGEDIN) {
      const updatedUserInfo = { ...this.userInfo, ...newUserInfo };
      this.setStatus(USER_STATUS.LOGGEDIN, { userInfo: updatedUserInfo });
    } else {
      console.warn('⚠️ 只有已登录状态才能更新用户信息');
    }
  },

  // 🔧 工具方法
  
  _syncToStorage(userInfo) {
    if (userInfo) {
      // 使用异步存储避免阻塞UI线程
      wx.setStorage({
        key: 'userInfo',
        data: userInfo,
        success: () => {
          console.log('✅ 用户信息已异步保存到本地存储');
        },
        fail: (error) => {
          console.warn('⚠️ 保存用户信息到本地存储失败:', error);
          // 降级到同步存储
          try {
            wx.setStorageSync('userInfo', userInfo);
          } catch (syncError) {
            console.error('❌ 同步存储也失败:', syncError);
          }
        }
      });
    }
  },

  _syncToGlobal(status, userInfo) {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.loginStatus = status;
      app.globalData.userInfo = userInfo;
    }
  },

  // 📊 计算属性 (Getters)
  
  get isLoggedIn() {
    return this.loginStatus === USER_STATUS.LOGGEDIN;
  },

  get hasError() {
    return this.loginStatus === USER_STATUS.ERROR;
  },

  get displayName() {
    return this.userInfo?.username || '未登录用户';
  },

  get avatarUrl() {
    return this.userInfo?.avatar || '/images/default_avatar.png';
  }
});

// 🎯 标记为MobX actions
Object.keys(userStore).forEach(key => {
  if (typeof userStore[key] === 'function' && !key.startsWith('get') && !key.startsWith('_')) {
    userStore[key] = action(userStore[key]);
  }
});

module.exports = {
  userStore,
  USER_STATUS
};