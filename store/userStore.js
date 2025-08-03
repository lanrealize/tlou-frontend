const { observable, action } = require('mobx-miniprogram');
const { checkLoginStatus, registerUser } = require('../utils/auth');

// 🎯 状态常量定义
const USER_STATUS = {
  LOGGEDIN: 'loggedIn',
  ERROR: 'error', 
  UNREGISTERED: 'unregistered'
};

// 🎭 身份类型常量
const IDENTITY_TYPE = {
  REAL: 'real',        // 真实身份
  VIRTUAL: 'virtual'   // 虚拟身份
};

// 用户状态管理Store
const userStore = observable({
  // 🔥 核心状态数据
  loginStatus: USER_STATUS.UNREGISTERED,
  userInfo: null,
  errorMessage: '',
  isLoading: false,

  // 🎭 虚拟身份管理
  realUserInfo: null,           // 真实用户信息（admin身份）
  currentIdentityType: IDENTITY_TYPE.REAL, // 当前身份类型
  virtualUsers: [],             // 可切换的虚拟用户列表

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
          hasIsAdmin: !!data.userInfo?.hasOwnProperty('isAdmin'),
          isAdminValue: data.userInfo?.isAdmin,
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
        
        // 如果是管理员且是第一次登录，设置真实用户信息
        if (result.userInfo?.isAdmin && this.currentIdentityType === IDENTITY_TYPE.REAL) {
          this.setRealUserInfo(result.userInfo);
        }
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

  // 🎭 虚拟身份管理方法

  // 设置真实用户信息（仅在admin首次登录时）
  setRealUserInfo(userInfo) {
    this.realUserInfo = userInfo;
    console.log('✅ 设置真实用户信息（admin）:', userInfo?.username);
  },

  // 加载虚拟用户列表
  async loadVirtualUsers() {
    if (!this.isAdmin) {
      console.warn('⚠️ 只有管理员才能加载虚拟用户列表');
      return;
    }

    try {
      this.setLoading(true, '加载虚拟用户列表...');
      
      const api = require('../utils/api');
      const res = await api.admin.getVirtualUsers();
      
      this.virtualUsers = res.data?.users || [];
      console.log('✅ 虚拟用户列表加载成功:', this.virtualUsers.length);
      
    } catch (error) {
      console.error('❌ 加载虚拟用户列表失败:', error);
      this.setStatus(USER_STATUS.ERROR, { message: error.message });
    } finally {
      this.setLoading(false);
    }
  },

  // 切换到虚拟身份
  switchToVirtualIdentity(virtualUser) {
    if (!this.isAdmin) {
      console.warn('⚠️ 只有管理员才能切换虚拟身份');
      return;
    }

    // 保存真实身份信息（如果是第一次切换）
    if (this.currentIdentityType === IDENTITY_TYPE.REAL) {
      this.setRealUserInfo(this.userInfo);
    }

    // 切换到虚拟身份
    this.currentIdentityType = IDENTITY_TYPE.VIRTUAL;
    this.setStatus(USER_STATUS.LOGGEDIN, { userInfo: virtualUser });
    
    console.log('🎭 已切换到虚拟身份:', virtualUser.username);
    wx.showToast({ title: `已切换为 ${virtualUser.username}`, icon: 'success' });
  },

  // 切换回真实身份
  switchToRealIdentity() {
    if (!this.realUserInfo) {
      console.warn('⚠️ 没有找到真实身份信息');
      return;
    }

    this.currentIdentityType = IDENTITY_TYPE.REAL;
    this.setStatus(USER_STATUS.LOGGEDIN, { userInfo: this.realUserInfo });
    
    console.log('👤 已切换回真实身份:', this.realUserInfo.username);
    wx.showToast({ title: `已切换为 ${this.realUserInfo.username}`, icon: 'success' });
  },

  // 创建虚拟用户
  async createVirtualUser(username, avatar) {
    if (!this.isAdmin) {
      console.warn('⚠️ 只有管理员才能创建虚拟用户');
      return;
    }

    try {
      this.setLoading(true, '创建虚拟用户...');
      
      const api = require('../utils/api');
      const res = await api.admin.createVirtualUser({ username, avatar });
      
      const newVirtualUser = res.data?.user;
      if (newVirtualUser) {
        this.virtualUsers.push(newVirtualUser);
        console.log('✅ 虚拟用户创建成功:', newVirtualUser.username);
        wx.showToast({ title: '虚拟用户创建成功', icon: 'success' });
        return newVirtualUser;
      } else {
        throw new Error('创建虚拟用户失败：响应数据格式错误');
      }
    } catch (error) {
      console.error('❌ 创建虚拟用户失败:', error);
      wx.showToast({ title: error.message || '创建失败', icon: 'error' });
      throw error;
    } finally {
      this.setLoading(false);
    }
  },

  // 删除虚拟用户
  async deleteVirtualUser(userId) {
    if (!this.isAdmin) {
      console.warn('⚠️ 只有管理员才能删除虚拟用户');
      return;
    }

    try {
      this.setLoading(true, '删除虚拟用户...');
      
      const api = require('../utils/api');
      await api.admin.deleteVirtualUser(userId);
      
      // 从本地列表中移除
      this.virtualUsers = this.virtualUsers.filter(user => user._id !== userId);
      console.log('✅ 虚拟用户删除成功');
      wx.showToast({ title: '删除成功', icon: 'success' });
      
    } catch (error) {
      console.error('❌ 删除虚拟用户失败:', error);
      wx.showToast({ title: error.message || '删除失败', icon: 'error' });
      throw error;
    } finally {
      this.setLoading(false);
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
  },

  // 🎭 虚拟身份相关的计算属性

  get isAdmin() {
    // 检查真实身份或当前身份是否为admin
    const checkUser = this.realUserInfo || this.userInfo;
    const result = checkUser?.isAdmin === true;
    
    // 临时调试：强制设置特定用户为管理员
    // TODO: 删除此临时代码，确保后端正确返回isAdmin字段
    if (checkUser && checkUser.username && checkUser.username.toLowerCase().includes('admin')) {
      console.log('🔧 临时强制设置管理员权限 (请检查后端isAdmin字段)');
      return true;
    }
    
    return result;
  },

  get isVirtualIdentity() {
    return this.currentIdentityType === IDENTITY_TYPE.VIRTUAL;
  },

  get isRealIdentity() {
    return this.currentIdentityType === IDENTITY_TYPE.REAL;
  },

  get currentIdentityInfo() {
    return {
      type: this.currentIdentityType,
      user: this.userInfo,
      isAdmin: this.isAdmin,
      isVirtual: this.isVirtualIdentity
    };
  },

  get adminDisplayInfo() {
    if (!this.isAdmin) return null;
    
    return {
      realUser: this.realUserInfo,
      currentUser: this.userInfo,
      identityType: this.currentIdentityType,
      virtualUsersCount: this.virtualUsers.length
    };
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
  USER_STATUS,
  IDENTITY_TYPE
};