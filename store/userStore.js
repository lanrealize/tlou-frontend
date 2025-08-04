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
        // 只有真实身份才同步到storage
        if (this.currentIdentityType === IDENTITY_TYPE.REAL) {
          this._syncToStorage(data.userInfo);
        }
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
  
  async checkLoginStatus() {
    this.setLoading(true, '检查登录状态...');
    
    try {
      // 🎭 应用启动时自动切换回真实身份（按照设计，虚拟身份不持久化）
      this.currentIdentityType = IDENTITY_TYPE.REAL;
      
      // 🔑 检查真实用户登录状态
      const result = await checkLoginStatus();
      
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
      console.warn('⚠️ 只有已登录状态才能更新用户信息');
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
      console.warn('⚠️ 非管理员用户无法切换虚拟身份');
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
  switchToRealIdentity() {
    // 重新检查登录状态，获取真实用户信息
    this.currentIdentityType = IDENTITY_TYPE.REAL;
    this.checkLoginStatus(); // 这将从本地存储恢复真实用户信息
    
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
  
  _syncToStorage(userInfo) {
    if (userInfo) {
      // 使用异步存储避免阻塞UI线程
      wx.setStorage({
        key: 'userInfo',
        data: userInfo,
        fail: (error) => {
          // 降级到同步存储
          try {
            wx.setStorageSync('userInfo', userInfo);
          } catch (syncError) {
            // 静默失败
          }
        }
      });
    }
    
    // 虚拟身份不持久化，无需同步到存储
  },
  
  // 虚拟身份不持久化，删除相关存储方法
  
  // 🔧 检查和修复状态一致性
  _checkAndFixStateConsistency() {
    const currentOpenid = wx.getStorageSync('openid');
    const currentUserInfo = this.userInfo;
    
    console.log('🔍 检查状态一致性:', {
      currentIdentityType: this.currentIdentityType,
      userInfoType: currentUserInfo?.isVirtual ? 'virtual' : 'real',
      hasRealUserInfo: !!this.realUserInfo,
      openidMatches: currentUserInfo?.openid === currentOpenid,
      currentUserName: currentUserInfo?.username,
      realUserName: this.realUserInfo?.username
    });
    
    // 🔧 特殊情况：如果当前是虚拟身份，只有在关键状态缺失时才修复
    if (this.currentIdentityType === IDENTITY_TYPE.VIRTUAL) {
      // 检查虚拟身份的关键组件是否完整
      const isVirtualStateComplete = this.realUserInfo && this.realUserOpenid && 
                                   currentUserInfo && currentUserInfo.isVirtual;
      
      if (!isVirtualStateComplete) {
        console.warn('⚠️ 检测到虚拟身份状态不完整:', {
          hasRealUserInfo: !!this.realUserInfo,
          hasRealOpenid: !!this.realUserOpenid,
          userInfoIsVirtual: currentUserInfo?.isVirtual
        });
        
        // 只有在完全无法恢复虚拟状态时才切换回真实身份
        if (!this.realUserInfo && currentUserInfo && !currentUserInfo.isVirtual) {
          console.log('🔄 无法恢复虚拟状态，切换回真实身份');
          this.currentIdentityType = IDENTITY_TYPE.REAL;
          this._syncVirtualIdentityToStorage();
        }
      }
      return; // 虚拟身份状态下不进行其他修复
    }
    
    // 🔧 真实身份状态下的一致性检查
    if (currentUserInfo && currentUserInfo.openid && currentUserInfo.openid !== currentOpenid) {
      console.warn('⚠️ 检测到openid不匹配，修复中...', {
        userInfoOpenid: currentUserInfo.openid,
        storageOpenid: currentOpenid
      });
      
      // 使用userInfo中的openid作为正确的openid
      wx.setStorageSync('openid', currentUserInfo.openid);
      console.log('✅ 已修复openid');
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
    // 简化版本：只检查当前用户的管理员权限
    // 虚拟身份下，根据需要可以在后端设置虚拟用户的isAdmin字段
    const checkUser = this.userInfo;
    
    // 方法1：检查用户信息中的isAdmin字段
    const hasAdminFlag = checkUser?.isAdmin === true;
    
    // 方法2：基于用户_id的权限检查（根据记忆，项目使用_id进行权限检查）
    // 如需添加管理员用户，请在此处添加用户ID：
    const adminUserIds = [
      // '675c21bb4e9a1234567890ab', // 示例用户ID，替换为实际管理员用户ID
    ];
    const isAdminById = checkUser?._id && adminUserIds.includes(checkUser._id);
    
    // 最终结果：优先使用isAdmin字段，如果没有则使用_id检查
    const result = hasAdminFlag || isAdminById;
    
    return result;
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