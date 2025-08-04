// pages/management/management.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');

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
    canCreateUser: false // 是否可以创建用户
  },

  onLoad() {
    this.setupStoreBindings();
    
    // 等待一个微任务周期让MobX绑定生效
    setTimeout(() => {
      this.checkPermissionAndLoad();
    }, 100);
  },

  onShow() {
    // 简化后：只需要刷新虚拟用户列表
    if (this.data.isAdmin) {
      this.loadVirtualUsers();
    }
  },

  // 权限检查和加载逻辑
  checkPermissionAndLoad() {
    const app = getApp();
    const userStore = app.getUserStore();
    
    // 使用UserStore的状态进行权限检查（更可靠）
    const hasAdminPermission = userStore.isAdmin;
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
      this.setData({
        isAdmin: hasAdminPermission,
        userInfo: userStore.userInfo,
        loginStatus: userStore.loginStatus
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
        realUserInfo: 'realUserInfo',
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
  switchIdentity(e) {
    const { type, user } = e.currentTarget.dataset;
    
    if (type === 'real') {
      this.switchToRealIdentity();
    } else if (type === 'virtual' && user) {
      this.switchToVirtualIdentity(user);
    }
    
    // 延迟返回主页，让用户看到切换结果
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
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