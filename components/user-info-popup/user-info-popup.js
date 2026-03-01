// components/user-info-popup/user-info-popup.js
const auth = require('../../utils/auth');
const util = require('../../utils/util');
const qiniuUploader = require('../../utils/qiniuUploader');
const qiniuConfig = require('../../utils/qiniuConfig');

// 默认头像地址 - 使用微信默认头像
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false
    },
    // 操作原因/提示文本
    rejectReason: {
      type: String,
      value: ''
    },
    // 待处理的意图
    pendingIntent: {
      type: String,
      value: ''
    },
    // 朋友圈ID（用于意图处理）
    circleId: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    avatarUrl: defaultAvatarUrl,
    nickname: '',
    isSubmitting: false,
    canSubmit: false,
    isUploadingAvatar: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initQiniuConfig();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化七牛云配置
     */
    initQiniuConfig() {
      try {
        const config = qiniuConfig.getQiniuConfig();
        qiniuConfig.validateConfig(config);
        qiniuUploader.init(config);
      } catch (error) {
        console.error('图片上传服务初始化失败:', error);
      }
    },

    /**
     * 防止滚动穿透
     */
    preventMove() {
      return false;
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
      const AvatarUploader = require('../../utils/avatarUploader');
      
      try {
        const openid = await auth.getOpenid();
        const avatarUrl = await AvatarUploader.uploadToQiniu(tempFilePath, openid);
        
        this.setData({ 
          avatarUrl: avatarUrl,
          isUploadingAvatar: false 
        }, () => {
          this.checkCanSubmit();
        });
        
        util.showToast('头像上传成功', 'success');
        
      } catch (error) {
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
        
        if (result.status === 'complete') {
          util.showToast('资料完善成功！', 'success');
          
          // 更新用户状态
          const app = getApp();
          const userStore = app.getUserStore();
          const { USER_STATUS } = require('../../store/userStore');
          userStore.setStatus(USER_STATUS.COMPLETE, { userInfo: result.userInfo });
          
          // 重置表单
          this.resetForm();
          
          // 触发成功事件，传递意图信息
          this.triggerEvent('success', {
            pendingIntent: this.data.pendingIntent,
            circleId: this.data.circleId
          });
          
        } else {
          throw new Error(result.reason || '资料完善失败');
        }
        
      } catch (error) {
        const app = getApp();
        const userStore = app.getUserStore();
        const { USER_STATUS } = require('../../store/userStore');
        userStore.setStatus(USER_STATUS.ERROR, { message: error.message || '资料完善失败，请重试' });
        
        util.showToast(error.message || '资料完善失败，请重试', 'error');
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

        const profileResult = await new Promise((resolve, reject) => {
          wx.request({
            url: `${this.getBaseUrl()}/wechat/complete-profile`,
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

        if (profileResult.statusCode !== 201) {
          throw new Error(`HTTP ${profileResult.statusCode}: ${profileResult.data?.message || '资料完善失败'}`);
        }
        
        if (!profileResult.data?.success) {
          throw new Error(profileResult.data?.message || '资料完善失败');
        }

        // 🔧 修复：后端返回的用户数据在 data.user 中，需要正确提取 _id
        const backendUser = profileResult.data.data?.user || profileResult.data.data;
        
        // 🔑 关键：确保 userInfo 中包含完整的后端数据（_id）和 openid
        const finalUserInfo = { 
          ...backendUser,      // 先展开后端数据（包含 _id）
          openid,              // 确保包含 openid
          username: nickname,  // 确保使用最新的 username
          avatar: avatarUrl    // 确保使用最新的 avatar
        };
        
        wx.setStorageSync('userInfo', finalUserInfo);
        
        return { 
          status: 'complete', 
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
     * 点击遮罩层 - 直接关闭（不触发 cancel 事件）
     */
    onMaskTap() {
      this.resetForm();
      this.triggerEvent('close');
    },

    /**
     * 重置表单
     */
    resetForm() {
      this.setData({
        avatarUrl: defaultAvatarUrl,
        nickname: '',
        canSubmit: false,
        isSubmitting: false,
        isUploadingAvatar: false
      });
    }
  }
});

