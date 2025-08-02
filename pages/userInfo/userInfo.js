// pages/userInfo/userInfo.js
const auth = require('../../utils/auth');
const util = require('../../utils/util');
const qiniuUploader = require('../../utils/qiniuUploader');
const qiniuConfig = require('../../utils/qiniuConfig');

// 默认头像地址
const defaultAvatarUrl = '/images/default_avatar.png';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    avatarUrl: defaultAvatarUrl,
    nickname: '',
    isSubmitting: false,
    canSubmit: false,
    isUploadingAvatar: false,
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44,
      navBarHeight: 88
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getSafeAreaInfo();
    this.initQiniuConfig();
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

  // 返回主页面
  navigateToMain() {
    util.navigateToMain();
  },

  /**
   * 初始化七牛云配置
   */
  initQiniuConfig() {
    try {
      const config = qiniuConfig.getQiniuConfig();
      qiniuConfig.validateConfig(config);
      qiniuUploader.init(config);
    } catch (error) {
      util.showToast('图片上传服务初始化失败', 'error');
    }
  },

  /**
   * 头像选择回调
   */
  async onChooseAvatar(e) {
    if (!e.detail || !e.detail.avatarUrl) {
      util.showToast('头像选择失败，请重试', 'error');
      return;
    }
    
    const { avatarUrl } = e.detail;
    
    this.setData({ 
      avatarUrl,
      isUploadingAvatar: true 
    });
    
    try {
      await this.uploadAvatarToQiniu(avatarUrl);
    } catch (error) {
      this.setData({ 
        avatarUrl: defaultAvatarUrl,
        isUploadingAvatar: false 
      });
      this.checkCanSubmit();
    }
  },

  /**
   * 上传头像到七牛云
   */
  async uploadAvatarToQiniu(tempFilePath) {
    try {
      util.showLoading('正在上传头像...');
      
      const openid = await auth.getOpenid();
      const uploadResult = await qiniuUploader.uploadImage(tempFilePath, openid, {
        pathType: 'avatar'
      });
      
      if (uploadResult.success) {
        this.setData({ 
          avatarUrl: uploadResult.url,
          isUploadingAvatar: false 
        }, () => {
          this.checkCanSubmit();
        });
        
        util.hideLoading();
        util.showToast('头像上传成功', 'success');
      } else {
        throw new Error(uploadResult.error || '上传失败');
      }
      
    } catch (error) {
      util.hideLoading();
      util.showToast(error.message || '头像上传失败', 'error');
      throw error;
    }
  },

  /**
   * 昵称输入回调
   */
  onNicknameInput(e) {
    const nickname = e.detail.value.trim();
    this.setData({ 
      nickname 
    }, () => {
      this.checkCanSubmit();
    });
  },

  /**
   * 检查是否可以提交
   */
  checkCanSubmit() {
    const { nickname, avatarUrl } = this.data;
    const hasNickname = nickname && nickname.length > 0;
    const hasAvatar = avatarUrl && avatarUrl !== '' && avatarUrl !== defaultAvatarUrl;
    const canSubmit = hasNickname && hasAvatar;
    
    this.setData({ canSubmit });
  },

  /**
   * 表单提交
   */
  async onFormSubmit(e) {
    const { nickname } = e.detail.value;
    const { avatarUrl } = this.data;
    
    if (!nickname || nickname.trim().length === 0) {
      util.showToast('请输入昵称', 'error');
      return;
    }
    
    if (!avatarUrl || avatarUrl === defaultAvatarUrl) {
      util.showToast('请选择头像', 'error');
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      const result = await this.submitUserInfo(nickname, avatarUrl);
      
      if (result.status === 'loggedIn') {
        util.showToast('注册成功！', 'success');
        
        // ✅ 使用简化的状态更新接口
        const app = getApp();
        const userStore = app.getUserStore();
        const { USER_STATUS } = require('../../store/userStore');
        userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: result.userInfo });
        
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/main/main'
          });
        }, 1500);
      } else {
        throw new Error(result.reason || '注册失败');
      }
      
    } catch (error) {
      // ✅ 使用简化的错误状态接口
      const app = getApp();
      const userStore = app.getUserStore();
      const { USER_STATUS } = require('../../store/userStore');
      userStore.setStatus(USER_STATUS.ERROR, { message: error.message || '注册失败，请重试' });
      
      util.showToast(error.message || '注册失败，请重试', 'error');
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  /**
   * 提交用户信息到后端
   */
  async submitUserInfo(nickname, avatarUrl) {
    try {
      const openid = await auth.getOpenid();

      const registerResult = await new Promise((resolve, reject) => {
        wx.request({
          url: `${this.getBaseUrl()}/wechat/register`,
          method: 'POST',
          data: { 
            openid, 
            username: nickname, 
            avatar: avatarUrl 
          },
          header: {
            'Content-Type': 'application/json'
          },
          success: resolve,
          fail: reject
        });
      });

      if (registerResult.statusCode !== 201) {
        throw new Error(`HTTP ${registerResult.statusCode}: ${registerResult.data?.message || '注册失败'}`);
      }
      
      if (!registerResult.data?.success) {
        throw new Error(registerResult.data?.message || '注册失败');
      }

      const finalUserInfo = { 
        username: nickname, 
        avatar: avatarUrl,
        ...registerResult.data.data
      };
      
      wx.setStorageSync('userInfo', finalUserInfo);
      
      return { 
        status: 'loggedIn', 
        userInfo: finalUserInfo 
      };
      
    } catch (error) {
      throw error;
    }
  },

  /**
   * 获取API基础地址
   */
  getBaseUrl() {
    const app = getApp();
    return app ? app.globalData.baseUrl : 'http://localhost:3000/api';
  },

  /**
   * 表单重置
   */
  onFormReset() {
    this.setData({
      avatarUrl: defaultAvatarUrl,
      nickname: '',
      canSubmit: false
    });
  },

  /**
   * 取消按钮点击
   */
  onCancel() {
    wx.switchTab({
      url: '/pages/main/main'
    });
  }
});