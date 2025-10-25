const { observable, action } = require('mobx-miniprogram');
const { initUserAuthInStorage, registerUser } = require('../utils/auth');

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

  // 🎭 虚拟身份管理 - 简化设计
  currentIdentityType: IDENTITY_TYPE.REAL, // 当前身份类型  
  virtualUsers: [],             // 可切换的虚拟用户列表
  // 注意：不再存储realUserInfo，mobx中只有一组userInfo代表当前身份

  // 🎯 统一状态更新接口
  setStatus(status, data = {}) {
    this.loginStatus = status;
    this.isLoading = false;
    
    switch (status) {
      case USER_STATUS.LOGGEDIN:
        this.userInfo = data.userInfo;
        this.errorMessage = '';
        // MobX 状态不写入 storage，storage 只由后端返回数据直接写入
        this._syncToGlobal(status, data.userInfo);
        break;
        
      case USER_STATUS.ERROR:
        this.userInfo = null;
        this.errorMessage = data.message || '发生错误';
        this._syncToGlobal(status, null);
        break;
        
      case USER_STATUS.UNREGISTERED:
        this.userInfo = null;
        this.errorMessage = data.message || '';
        this._syncToGlobal(status, null);
        break;
    }
  },

  // 🔧 设置加载状态
  setLoading(isLoading, message = '') {
    this.isLoading = isLoading;
    this.errorMessage = message;
  },

  // 📋 核心业务方法
  
  async initializeFromStorage() {
    this.setLoading(true, '初始化用户状态...');
    
    try {
      // 🎭 应用启动时自动切换回真实身份（按照设计，虚拟身份不持久化）
      this.currentIdentityType = IDENTITY_TYPE.REAL;
      
      // 🔑 从 Storage 初始化真实用户认证信息
      const result = await initUserAuthInStorage();
      
      if (result.status === 'loggedIn') {
        this.setStatus(USER_STATUS.LOGGEDIN, { userInfo: result.userInfo });
        
        // 🔧 检查和修复状态一致性
        this._checkAndFixStateConsistency();
        
        // 设置当前用户信息（无需额外处理）
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
        this.setLoading(false); // 等待用户在弹出层完成注册
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
    // 清除本地存储
    wx.removeStorageSync('openid');
    wx.removeStorageSync('userInfo');
    
    // 重置身份状态
    this.currentIdentityType = IDENTITY_TYPE.REAL;
    
    this.setStatus(USER_STATUS.UNREGISTERED);
    wx.showToast({ title: '已退出登录', icon: 'success' });
  },

  updateUserInfo(newUserInfo) {
    if (this.loginStatus === USER_STATUS.LOGGEDIN) {
      const updatedUserInfo = { ...this.userInfo, ...newUserInfo };
      this.setStatus(USER_STATUS.LOGGEDIN, { userInfo: updatedUserInfo });
    } else {

    }
  },

  // 🎭 虚拟身份管理方法

  // 加载虚拟用户列表
  async loadVirtualUsers() {
    if (!this.isAdmin) {
      return;
    }

    try {
      this.setLoading(true, '加载虚拟用户列表...');
      
      const api = require('../utils/api');
      const res = await api.admin.getVirtualUsers();
      
      this.virtualUsers = res.data?.users || [];
      
    } catch (error) {
      this.setStatus(USER_STATUS.ERROR, { message: error.message });
    } finally {
      this.setLoading(false);
    }
  },

  // 切换到虚拟身份 - 简化版本
  switchToVirtualIdentity(virtualUser) {
    if (!this.isAdmin) {

      return;
    }

    // 切换到虚拟身份：只更新mobx状态，不污染本地存储
    this.currentIdentityType = IDENTITY_TYPE.VIRTUAL;
    this.setStatus(USER_STATUS.LOGGEDIN, { userInfo: virtualUser });
    
    console.log('✅ 虚拟身份切换成功:', {
      currentUser: virtualUser.username,
      currentIdentityType: this.currentIdentityType
    });
    
    wx.showToast({ title: `已切换为 ${virtualUser.username}`, icon: 'success' });
  },

  // 切换回真实身份 - 简化版本
  async switchToRealIdentity() {
    // 重新初始化，从 Storage 恢复真实用户信息
    this.currentIdentityType = IDENTITY_TYPE.REAL;
    await this.initializeFromStorage(); // 从 Storage 恢复真实用户信息到 MobX
    
    // 重新加载虚拟用户列表
    if (this.isAdmin) {
      await this.loadVirtualUsers();
    }
    
    wx.showToast({ title: '已切换回真实身份', icon: 'success' });
  },

  // 创建虚拟用户
  async createVirtualUser(username, avatar) {
    if (!this.isAdmin) {
      return;
    }

    try {
      this.setLoading(true, '创建虚拟用户...');
      
      const api = require('../utils/api');
      const res = await api.admin.createVirtualUser({ username, avatar });
      
      const newVirtualUser = res.data?.user;
      if (newVirtualUser) {
        // 确保MobX能够检测到数组变化，使用直接赋值方式
        this.virtualUsers = [...this.virtualUsers, newVirtualUser];
        wx.showToast({ title: '虚拟用户创建成功', icon: 'success' });
        return newVirtualUser;
      } else {
        throw new Error('创建虚拟用户失败：响应数据格式错误');
      }
    } catch (error) {
      wx.showToast({ title: error.message || '创建失败', icon: 'error' });
      throw error;
    } finally {
      this.setLoading(false);
    }
  },

  // 删除虚拟用户
  async deleteVirtualUser(userId) {
    if (!this.isAdmin) {
      return;
    }

    try {
      this.setLoading(true, '删除虚拟用户...');
      
      const api = require('../utils/api');
      await api.admin.deleteVirtualUser(userId);
      
      // 从本地列表中移除，确保MobX能够检测到数组变化
      this.virtualUsers = this.virtualUsers.filter(user => user._id !== userId);
      wx.showToast({ title: '删除成功', icon: 'success' });
      
    } catch (error) {
      wx.showToast({ title: error.message || '删除失败', icon: 'error' });
      throw error;
    } finally {
      this.setLoading(false);
    }
  },

  // 🔧 工具方法
  
  // 简化后：不再需要复杂的状态一致性检查
  _checkAndFixStateConsistency() {
    // 简化架构下，状态管理更清晰，不需要复杂的一致性检查
    console.log('🔍 当前身份状态:', {
      currentIdentityType: this.currentIdentityType,
      userInfoType: this.userInfo?.isVirtual ? 'virtual' : 'real'
    });
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
    // 🎯 终极简化版本：后端已确保虚拟用户的isAdmin字段正确设置
    // 无论真实身份还是虚拟身份，都直接检查userInfo.isAdmin
    return this.userInfo?.isAdmin === true;
  },

  get isVirtualIdentity() {
    return this.currentIdentityType === IDENTITY_TYPE.VIRTUAL;
  },

  // 数据刷新交给页面onShow处理，无需复杂的刷新机制

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