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
    
    // 头像选择
    avatarOptions: [
      'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4uBMD/132',
      'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4uBME/132',
      'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4uBMF/132',
      'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4uBMG/132',
      'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4uBMH/132',
      'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4uBMI/132'
    ],
    selectedAvatarIndex: 0
  },

  onLoad() {
    console.log('🎭 管理页面加载');
    this.setupStoreBindings();
    
    // 检查管理员权限
    if (!this.data.isAdmin) {
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
    
    // 加载虚拟用户列表
    this.loadVirtualUsers();
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
  },

  // 头像选择
  selectAvatar(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      selectedAvatarIndex: index,
      'newVirtualUser.avatar': this.data.avatarOptions[index]
    });
  },

  // 创建虚拟用户
  async createVirtualUser() {
    const { username, avatar } = this.data.newVirtualUser;
    
    if (!username.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }

    if (!avatar) {
      // 使用默认头像
      const defaultAvatar = this.data.avatarOptions[this.data.selectedAvatarIndex];
      this.setData({
        'newVirtualUser.avatar': defaultAvatar
      });
    }

    try {
      this.setData({ isCreating: true });
      
      await this.createVirtualUser(username.trim(), this.data.newVirtualUser.avatar || this.data.avatarOptions[0]);
      
      // 重置表单
      this.setData({
        'newVirtualUser.username': '',
        'newVirtualUser.avatar': '',
        selectedAvatarIndex: 0,
        isCreating: false
      });
      
    } catch (error) {
      console.error('创建虚拟用户失败:', error);
      this.setData({ isCreating: false });
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
  async deleteVirtualUser(e) {
    const { user } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除虚拟用户 ${user.username} 吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await this.deleteVirtualUser(user._id);
          } catch (error) {
            console.error('删除虚拟用户失败:', error);
          }
        }
      }
    });
  }
});