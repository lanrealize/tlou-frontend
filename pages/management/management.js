// pages/management/management.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const navigationHelper = require('../../utils/navigationHelper');
const { isCurrentUserAdmin, getCurrentUser } = require('../../utils/checkUserActionPermission');

Page({
  behaviors: [storeBindingsBehavior],
  
  data: {
    // 表单数据
    newVirtualUser: {
      username: '',
      avatar: ''
    },
    isCreating: false,
    isUploadingAvatar: false, // 头像上传状态
    defaultAvatar: '/images/default_avatar.png', // 默认头像
    canCreateUser: false, // 是否可以创建用户
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44,
      totalNavigationHeight: 88
    }
  },

  onLoad() {
    this.setupStoreBindings();
    this.initNavigation();
    
    // ✅ 修复：直接检查权限，无需setTimeout
    this.checkPermissionAndLoad();
  },

  onShow() {
    // 简化后：只需要刷新虚拟用户列表
    if (this.data.isAdmin) {
      this.loadVirtualUsers();
    }
  },

  // 权限检查和加载逻辑
  checkPermissionAndLoad() {
    // ✅ 修复：使用统一的权限检查函数
    const hasAdminPermission = isCurrentUserAdmin();
    const pageIsAdmin = this.data.isAdmin;
    
    if (!hasAdminPermission) {
      wx.showModal({
        title: '权限不足',
        content: '需要管理员权限才能访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }
    
    // 如果UserStore有权限但页面状态没同步，手动同步
    if (hasAdminPermission && pageIsAdmin !== hasAdminPermission) {
      const currentUser = getCurrentUser();
      const app = getApp();
      const userStore = app?.getUserStore();
      
      this.setData({
        isAdmin: hasAdminPermission,
        userInfo: currentUser,
        loginStatus: userStore?.loginStatus || 'unregistered'
      });
    }
    
    // 加载虚拟用户列表
    this.loadVirtualUsers();
    
    // 初始化按钮状态
    this.checkCreateButtonState();
  },

  onUnload() {
    if (this.storeBindings) {
      this.storeBindings.destroyStoreBindings();
    }
  },

  // 初始化导航栏
  initNavigation() {
    const app = getApp();
    if (app && app.globalData.safeAreaInfo) {
      // 添加导航栏高度计算
      const statusBarHeight = app.globalData.safeAreaInfo.statusBarHeight || 44;
      const navigationBarHeight = 44;
      const totalNavigationHeight = statusBarHeight + navigationBarHeight;
      
      this.setData({
        safeAreaInfo: {
          ...app.globalData.safeAreaInfo,
          totalNavigationHeight
        },
        // 保持向后兼容的字段
        statusBarHeight,
        navigationBarHeight,
        totalNavigationHeight,
        titleBarHeight: 44,
        navigationHeight: totalNavigationHeight
      });
    } else {
      // 兜底方案
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 44;
      const navigationBarHeight = 44;
      const totalNavigationHeight = statusBarHeight + navigationBarHeight;
      
      this.setData({
        safeAreaInfo: {
          statusBarHeight,
          navigationBarHeight,
          totalNavigationHeight
        },
        statusBarHeight,
        navigationBarHeight,
        totalNavigationHeight,
        titleBarHeight: 44,
        navigationHeight: totalNavigationHeight
      });
    }
  },

  // 返回按钮点击事件
  onBackTap() {
    wx.navigateBack();
  },

  setupStoreBindings() {
    const app = getApp();
    const userStore = app.getUserStore();
    
    this.storeBindings = createStoreBindings(this, {
      store: userStore,
      fields: {
        // 添加更多状态绑定以确保完整性
        loginStatus: 'loginStatus',
        isLoggedIn: 'isLoggedIn',
        isAdmin: 'isAdmin',
        // 简化后：不再需要realUserInfo绑定
        userInfo: 'userInfo',
        currentIdentityType: 'currentIdentityType',
        isVirtualIdentity: 'isVirtualIdentity',
        virtualUsers: 'virtualUsers',
        adminDisplayInfo: 'adminDisplayInfo'
      },
      actions: {
        loadVirtualUsers: 'loadVirtualUsers',
        switchToVirtualIdentity: 'switchToVirtualIdentity',
        switchToRealIdentity: 'switchToRealIdentity',
        createVirtualUser: 'createVirtualUser',
        deleteVirtualUser: 'deleteVirtualUser'
      }
    });
  },

  // 输入处理
  onUsernameInput(e) {
    this.setData({
      'newVirtualUser.username': e.detail.value
    });
    
    // 实时检查按钮状态
    this.checkCreateButtonState();
  },

  // 检查创建按钮状态
  checkCreateButtonState() {
    const { username } = this.data.newVirtualUser;
    const isUsernameValid = username && username.trim().length > 0;
    
    this.setData({
      canCreateUser: isUsernameValid && !this.data.isCreating
    });
  },

  // 头像上传（使用通用工具）
  async uploadAvatar() {
    const AvatarUploader = require('../../utils/avatarUploader');
    
    try {
      const avatarUrl = await AvatarUploader.chooseAndUpload({
        onStart: () => {
          this.setData({ isUploadingAvatar: true });
        },
        onSuccess: (url) => {
          this.setData({
            'newVirtualUser.avatar': url,
            isUploadingAvatar: false
          });
          wx.showToast({
            title: '头像上传成功',
            icon: 'success',
            duration: 2000
          });
        },
        onError: (error) => {
          console.error('头像上传失败:', error);
          this.setData({ isUploadingAvatar: false });
          AvatarUploader.showErrorMessage(error, true); // 使用Modal显示错误
        }
      });
      
    } catch (error) {
      // 错误已在onError中处理
    }
  },

  // 创建虚拟用户（页面方法）
  async createVirtualUserHandler() {
    const { username, avatar } = this.data.newVirtualUser;
    
    if (!username.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }

    // 如果没有上传头像，使用默认头像
    const finalAvatar = avatar || this.data.defaultAvatar;

    try {
      this.setData({ 
        isCreating: true,
        canCreateUser: false // 创建中禁用按钮
      });
      
      // 调用Store中的createVirtualUser方法
      await this.createVirtualUser(username.trim(), finalAvatar);
      
      // 重置表单
      this.setData({
        'newVirtualUser.username': '',
        'newVirtualUser.avatar': '',
        isCreating: false,
        canCreateUser: false
      });
      
      // 重新加载虚拟用户列表确保显示最新数据
      await this.loadVirtualUsers();
      
    } catch (error) {
      console.error('创建虚拟用户失败:', error);
      this.setData({ 
        isCreating: false
      });
      // 重新检查按钮状态
      this.checkCreateButtonState();
    }
  },

  // 切换身份
  async switchIdentity(e) {
    const { type, user } = e.currentTarget.dataset;
    
    if (type === 'real') {
      await this.switchToRealIdentity();
      // userStore 会自动刷新虚拟用户列表
    } else if (type === 'virtual' && user) {
      await this.switchToVirtualIdentity(user);
    }
    
    // 不再自动返回主页，让用户留在管理页面
  },

  // 删除虚拟用户
  async deleteVirtualUserHandler(e) {
    const { user } = e.currentTarget.dataset;
    
    // 验证用户数据
    if (!user || !user._id) {
      wx.showToast({ title: '用户信息错误', icon: 'error' });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除虚拟用户 ${user.username} 吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用Store中的deleteVirtualUser方法，传递用户ID字符串
            await this.deleteVirtualUser(user._id);
          } catch (error) {
            console.error('删除虚拟用户失败:', error);
            wx.showToast({ title: '删除失败', icon: 'error' });
          }
        }
      }
    });
  }
});