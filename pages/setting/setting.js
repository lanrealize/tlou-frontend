// pages/setting/setting.js
const api = require('../../utils/api');
const util = require('../../utils/util');
const qiniuUploader = require('../../utils/qiniuUploader');
const qiniuConfig = require('../../utils/qiniuConfig');
const auth = require('../../utils/auth');

Page({
  data: {
    userInfo: null,           // 用户信息
    version: '1.0.0',         // 应用版本
    cacheSize: '0KB',         // 缓存大小
    showAbout: false,         // 显示关于对话框
    showUserInfoDialog: false, // 显示用户信息编辑对话框
    newUsername: '',          // 新用户名
    systemInfo: null,         // 系统信息
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44
    }
  },

  onLoad(options) {
    console.log('设置页面加载', options);
    this.getSafeAreaInfo();
    this.initPage();
  },

  // 获取安全区域信息
  getSafeAreaInfo() {
    const app = getApp();
    if (app && app.globalData.safeAreaInfo) {
      this.setData({
        safeAreaInfo: app.globalData.safeAreaInfo
      });
    }
  },

  onShow() {
    console.log('设置页面显示');
    this.loadUserInfo();
  },

  // 返回主页面
  navigateToMain() {
    util.navigateToMain();
  },

  // 初始化页面
  initPage() {
    this.initQiniuConfig();
    this.loadUserInfo();
    this.calculateCacheSize();
    this.getSystemInfo();
  },

  /**
   * 初始化七牛云配置
   */
  initQiniuConfig() {
    try {
      const config = qiniuConfig.getQiniuConfig();
      qiniuConfig.validateConfig(config);
      qiniuUploader.init(config);
      console.log('✅ 七牛云配置初始化成功');
    } catch (error) {
      console.error('❌ 七牛云配置初始化失败:', error);
      console.warn('请检查 utils/qiniuConfig.js 中的配置参数');
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const app = getApp();
    this.setData({
      userInfo: app.globalData.userInfo
    });
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({ systemInfo: res });
      }
    });
  },

  // 计算缓存大小
  calculateCacheSize() {
    wx.getStorageInfo({
      success: (res) => {
        const sizeKB = Math.round(res.currentSize);
        let sizeText = '';
        
        if (sizeKB < 1024) {
          sizeText = sizeKB + 'KB';
        } else {
          sizeText = (sizeKB / 1024).toFixed(1) + 'MB';
        }
        
        this.setData({ cacheSize: sizeText });
      },
      fail: () => {
        this.setData({ cacheSize: '未知' });
      }
    });
  },

  // 显示用户信息编辑对话框
  showUserInfoDialog() {
    this.setData({
      showUserInfoDialog: true,
      newUsername: this.data.userInfo ? this.data.userInfo.username : ''
    });
  },

  // 隐藏用户信息编辑对话框
  hideUserInfoDialog() {
    this.setData({ showUserInfoDialog: false });
  },

  // 输入新用户名
  onUsernameInput(e) {
    this.setData({ newUsername: e.detail.value });
  },

  // 更新用户信息
  async updateUserInfo() {
    const { newUsername } = this.data;

    if (util.isEmpty(newUsername)) {
      util.showToast('请输入用户名');
      return;
    }

    if (newUsername.length > 20) {
      util.showToast('用户名不能超过20个字符');
      return;
    }

    try {
      util.showLoading('更新中...');

      // 更新本地存储和全局数据
      const app = getApp();
      const userInfo = { ...app.globalData.userInfo, username: newUsername.trim() };
      
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;

      this.setData({ userInfo });

      util.hideLoading();
      util.showToast('更新成功');

      // 隐藏对话框
      this.hideUserInfoDialog();

    } catch (error) {
      util.hideLoading();
      console.error('更新用户信息失败:', error);
      util.showToast('更新失败');
    }
  },

  // 选择头像
  async chooseAvatar() {
    try {
      const res = await util.chooseImage(1, ['compressed'], ['album', 'camera']);
      const tempFilePath = res.tempFilePaths[0];
      
      console.log('✅ 选择头像成功:', tempFilePath);
      
      // 立即显示预览图片
      const app = getApp();
      const userInfo = { ...app.globalData.userInfo, avatar: tempFilePath };
      this.setData({ userInfo });
      
      // 上传到七牛云
      await this.uploadAvatarToQiniu(tempFilePath);
      
    } catch (error) {
      console.error('选择头像失败:', error);
      if (error.errMsg && !error.errMsg.includes('cancel')) {
        util.showToast('选择头像失败');
      }
    }
  },

  /**
   * 上传头像到七牛云
   */
  async uploadAvatarToQiniu(tempFilePath) {
    try {
      util.showLoading('正在上传头像...');
      
      // 获取用户openid作为userId
      const openid = await auth.getOpenid();
      
      // 上传到七牛云
      const uploadResult = await qiniuUploader.uploadImage(tempFilePath, openid, {
        pathType: 'avatar', // 指定为头像类型
        onProgress: (progress) => {
          console.log('📊 上传进度:', progress);
        }
      });
      
      if (uploadResult.success) {
        // 上传成功，更新头像URL
        const app = getApp();
        const userInfo = { ...app.globalData.userInfo, avatar: uploadResult.url };
        
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.userInfo = userInfo;
        
        this.setData({ userInfo });
        
        util.hideLoading();
        util.showToast('头像更新成功', 'success');
        console.log('✅ 头像上传成功:', uploadResult);
      } else {
        throw new Error(uploadResult.error || '上传失败');
      }
      
    } catch (error) {
      console.error('❌ 头像上传失败:', error);
      util.hideLoading();
      
      let errorMessage = '头像上传失败';
      if (error.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      util.showToast(errorMessage, 'error');
      
      // 恢复原头像
      this.loadUserInfo();
    }
  },

  // 清除缓存
  async clearCache() {
    const confirm = await util.showConfirm('确定要清除所有缓存数据吗？此操作不可恢复。', '清除缓存');
    if (!confirm) return;

    try {
      util.showLoading('清除中...');

      // 保留重要数据
      const openid = wx.getStorageSync('openid');
      const userInfo = wx.getStorageSync('userInfo');

      // 清除所有缓存
      wx.clearStorageSync();

      // 恢复重要数据
      if (openid) wx.setStorageSync('openid', openid);
      if (userInfo) wx.setStorageSync('userInfo', userInfo);

      util.hideLoading();
      util.showToast('缓存清除成功');

      // 重新计算缓存大小
      this.calculateCacheSize();

    } catch (error) {
      util.hideLoading();
      console.error('清除缓存失败:', error);
      util.showToast('清除失败');
    }
  },

  // 检查更新
  checkUpdate() {
    if (wx.getUpdateManager) {
      const updateManager = wx.getUpdateManager();

      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          util.showToast('发现新版本，准备下载');
          
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });

          updateManager.onUpdateFailed(() => {
            util.showToast('新版本下载失败');
          });
        } else {
          util.showToast('当前已是最新版本');
        }
      });
    } else {
      util.showToast('当前微信版本过低，无法使用该功能');
    }
  },

  // 显示关于对话框
  showAbout() {
    this.setData({ showAbout: true });
  },

  // 隐藏关于对话框
  hideAbout() {
    this.setData({ showAbout: false });
  },

  // 打开图片上传测试页面
  openUploadTest() {
    wx.navigateTo({
      url: '/pages/test-upload/test-upload'
    });
  },

  // 意见反馈
  feedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },

  // 用户协议
  userAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 隐私政策
  privacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  // 退出登录
  async logout() {
    const confirm = await util.showConfirm('确定要退出登录吗？', '退出登录');
    if (!confirm) return;

    try {
      const app = getApp();
      app.logout();

      util.showToast('已退出登录');

      // 跳转到登录页面或重新初始化
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/main/main'
        });
      }, 1000);

    } catch (error) {
      console.error('退出登录失败:', error);
      util.showToast('退出失败');
    }
  },

  // 联系客服
  contactService() {
    wx.makePhoneCall({
      phoneNumber: '400-000-0000',
      fail: () => {
        util.setClipboardData('400-000-0000');
        util.showToast('客服电话已复制');
      }
    });
  },

  // 分享应用
  onShareAppMessage() {
    return {
      title: '朋友圈小程序 - 记录生活，分享美好',
      path: '/pages/main/main',
      imageUrl: '/images/share_cover.jpg'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '朋友圈小程序 - 记录生活，分享美好',
      query: '',
      imageUrl: '/images/share_cover.jpg'
    };
  }
});