// pages/userInfo/userInfo.js
const auth = require('../../utils/auth');
const util = require('../../utils/util');
const qiniuUploader = require('../../utils/qiniuUploader');
const qiniuConfig = require('../../utils/qiniuConfig');
const navigationHelper = require('../../utils/navigationHelper');
const userStatus = require('../../utils/userStatus');

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
    // 导航栏信息
    navigationData: {
      totalNavigationHeight: 88
    },
    // 意图信息
    rejectReason: '',
    pendingIntent: null,
    circleId: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initQiniuConfig();
    
    // 处理从其他页面传来的参数
    if (options.reason) {
      this.setData({
        rejectReason: decodeURIComponent(options.reason)
      });
    }
    
    if (options.intent && options.circleId) {
      this.setData({
        pendingIntent: options.intent,
        circleId: options.circleId
      });
    }
  },

  // 处理导航栏准备完成事件
  onNavigationReady(event) {
    const { navigationData } = event.detail;
    this.setData({
      navigationData: navigationData
    });
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
   * 上传头像到七牛云（使用通用工具）
   */
  async uploadAvatarToQiniu(tempFilePath) {
    const AvatarUploader = require('../../utils/avatarUploader');
    
    try {
      util.showLoading('正在上传头像...');
      
      const openid = await auth.getOpenid();
      const avatarUrl = await AvatarUploader.uploadToQiniu(tempFilePath, openid);
      
      this.setData({ 
        avatarUrl: avatarUrl,
        isUploadingAvatar: false 
      }, () => {
        this.checkCanSubmit();
      });
      
      util.hideLoading();
      util.showToast('头像上传成功', 'success');
      
    } catch (error) {
      util.hideLoading();
      this.setData({ isUploadingAvatar: false });
      AvatarUploader.showErrorMessage(error);
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
        
        // 更新用户状态
        const app = getApp();
        const userStore = app.getUserStore();
        const { USER_STATUS } = require('../../store/userStore');
        userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: result.userInfo });
        
        // 检查是否有待处理的意图
        const { pendingIntent, circleId } = this.data;
        
        if (pendingIntent && circleId) {
          // 有待处理的意图，执行相应操作
          await this.handlePendingIntent(pendingIntent, circleId);
        } else {
          // 无意图，跳转到主页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/main/main'
            });
          }, 1500);
        }
      } else {
        throw new Error(result.reason || '注册失败');
      }
      
    } catch (error) {
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
    const { BACKEND_CONFIG } = require('../../config/backend');
    return app ? app.globalData.baseUrl : BACKEND_CONFIG.BASE_URL;
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
  },

  /**
   * 处理待处理的意图
   */
  async handlePendingIntent(intentType, circleId) {
    try {
      if (intentType === 'invited') {
        // 接受邀请
        await this.executeAcceptInvite(circleId);
        util.showToast('已加入朋友圈', 'success');
      } else if (intentType === 'can_apply') {
        // 申请加入
        await this.executeApplyToJoin(circleId);
        util.showToast('申请已提交', 'success');
      }
      
      // 跳转到朋友圈详情页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/details/details?circleId=${circleId}`
        });
      }, 1500);
      
    } catch (error) {
      util.showToast(error.message || '操作失败', 'error');
      
      // 即使失败也跳转到详情页，让用户重试
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/details/details?circleId=${circleId}`
        });
      }, 1500);
    }
  },

  /**
   * 执行接受邀请
   */
  async executeAcceptInvite(circleId) {
    const openid = await auth.getOpenid();
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.getBaseUrl()}/circles/${circleId}/accept-invite`,
        method: 'POST',
        data: { openid },
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            resolve(res.data);
          } else {
            reject(new Error(res.data?.message || '接受邀请失败'));
          }
        },
        fail: reject
      });
    });
  },

  /**
   * 执行申请加入
   */
  async executeApplyToJoin(circleId) {
    const openid = await auth.getOpenid();
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.getBaseUrl()}/circles/${circleId}/apply`,
        method: 'POST',
        data: { openid },
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            resolve(res.data);
          } else {
            reject(new Error(res.data?.message || '申请失败'));
          }
        },
        fail: reject
      });
    });
  }
});