// pages/publish/publish.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  // 使用MobX状态管理行为
  behaviors: [storeBindingsBehavior],
  
  data: {
    circleId: '',           // 朋友圈ID
    circle: null,           // 朋友圈信息
    content: '',            // 发布内容
    images: [],             // 选择的图片列表
    tempImages: [],         // 临时图片路径（用于预览）
    isPublishing: false,    // 发布状态
    maxImages: 9,           // 最大图片数量
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44
    }
  },

  onLoad(options) {
    console.log('🚀 发布页面加载', options);
    
    this.getSafeAreaInfo();
    this.setupStoreBindings();
    
    const { circleId } = options;
    
    if (circleId) {
      this.setData({ circleId });
      this.loadCircleInfo();
    } else {
      util.showToast('朋友圈ID不能为空');
      wx.navigateBack();
      return;
    }

    // 延迟执行用户信息同步，确保MobX绑定完成
    setTimeout(() => {
      const app = getApp();
      const userStore = app.getUserStore();
      
      this.setData({
        userInfo: this.data.userInfo || app.globalData.userInfo || userStore.userInfo,
        isLoggedIn: this.data.isLoggedIn || app.globalData.loginStatus === 'loggedIn' || userStore.isLoggedIn
      });
      
      console.log('⏰ 延迟同步用户信息:', {
        userInfo: this.data.userInfo,
        isLoggedIn: this.data.isLoggedIn
      });
    }, 100);
  },

  onShow() {
    console.log('👁️ 发布页面显示');
    
    // 页面显示时检查用户状态
    const app = getApp();
    const userStore = app.getUserStore();
    
    // 更新当前用户信息（可能在其他页面发生了变化）
    this.setData({
      userInfo: this.data.userInfo || app.globalData.userInfo || userStore.userInfo,
      isLoggedIn: this.data.isLoggedIn || app.globalData.loginStatus === 'loggedIn' || userStore.isLoggedIn
    });
    
    console.log('🔄 页面显示时用户状态更新:', {
      userInfo: this.data.userInfo,
      isLoggedIn: this.data.isLoggedIn
    });
  },

  onUnload() {
    // 清理MobX绑定
    if (this.storeBindings) {
      this.storeBindings.destroyStoreBindings();
    }
  },

  // 设置MobX Store绑定
  setupStoreBindings() {
    const app = getApp();
    const userStore = app.getUserStore();
    
    this.storeBindings = createStoreBindings(this, {
      store: userStore,
      fields: {
        userInfo: 'userInfo',
        isLoggedIn: 'isLoggedIn'
      },
      actions: {}
    });


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

  // 加载朋友圈信息
  async loadCircleInfo() {
    try {
      const res = await api.circles.getMy();
      const circle = res.data.circles.find(c => c._id === this.data.circleId);
      
      if (!circle) {
        throw new Error('朋友圈不存在');
      }

      this.setData({ circle });
    } catch (error) {
      console.error('加载朋友圈信息失败:', error);
      util.showToast('朋友圈信息加载失败');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 内容输入
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // 选择图片
  chooseImages() {
    const remainingCount = this.data.maxImages - this.data.tempImages.length;
    
    if (remainingCount <= 0) {
      util.showToast(`最多只能选择${this.data.maxImages}张图片`);
      return;
    }

    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: (res) => {
        const tempFiles = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          tempImages: [...this.data.tempImages, ...tempFiles]
        });
        console.log('选择了图片:', tempFiles);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        util.showToast('选择图片失败');
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const current = this.data.tempImages[index];
    
    wx.previewImage({
      current,
      urls: this.data.tempImages
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const tempImages = [...this.data.tempImages];
    tempImages.splice(index, 1);
    
    this.setData({ tempImages });
  },

  // 上传图片（使用七牛云）
  async uploadImages() {
    if (this.data.tempImages.length === 0) {
      return [];
    }

    try {
      wx.showLoading({ title: '上传图片中...', mask: true });
      
      // 使用项目中的七牛云上传工具
      const qiniuUploader = require('../../utils/qiniuUploader');
      const qiniuConfig = require('../../utils/qiniuConfig');
      
      // 初始化七牛云上传工具
      try {
        if (!qiniuUploader.isInitialized) {
          console.log('🔧 正在初始化七牛云上传工具...');
          
          // 获取配置
          const config = qiniuConfig.getQiniuConfig();
          console.log('📋 七牛云配置:', {
            bucket: config.bucket,
            domain: config.domain,
            region: config.region,
            hasToken: !!config.upToken && config.upToken !== 'NEED_TO_GET_FROM_BACKEND_API'
          });
          
          // 如果需要从后端获取token
          if (!config.upToken || config.upToken === 'NEED_TO_GET_FROM_BACKEND_API') {
            console.log('🔑 尝试从后端获取上传Token...');
            try {
              const token = await qiniuConfig.getUploadToken();
              config.upToken = token;
              console.log('✅ 从后端获取Token成功');
            } catch (tokenError) {
              console.error('❌ 获取上传Token失败:', tokenError);
              throw new Error('无法获取图片上传凭证');
            }
          }
          
          // 初始化上传工具
          await qiniuUploader.init(config);
          console.log('✅ 七牛云上传工具初始化成功');
        }
      } catch (initError) {
        console.error('❌ 七牛云初始化失败:', initError);
        // 如果初始化失败，提供选择
        wx.hideLoading();
        
        return new Promise((resolve, reject) => {
          wx.showModal({
            title: '图片上传服务异常',
            content: '图片上传功能暂时不可用，是否继续发布（仅文字内容）？',
            showCancel: true,
            cancelText: '取消发布',
            confirmText: '仅发布文字',
            success: (res) => {
              if (res.confirm) {
                console.log('📝 用户选择跳过图片，仅发布文字');
                resolve([]); // 返回空数组，继续发布流程
              } else {
                reject(new Error('用户取消发布'));
              }
            },
            fail: () => {
              reject(new Error('用户取消发布'));
            }
          });
        });
      }
      
      // 获取用户ID - 多种方式尝试获取
      const app = getApp();
      const userStore = app.getUserStore();
      


      let userId = null;
      let userInfoSource = '';
      
      // 方式1: 从页面data中获取，尝试多种字段名
      if (this.data.userInfo) {
        const userInfo = this.data.userInfo;
        userId = userInfo._id || userInfo.openid || userInfo.id || userInfo.userId || userInfo.user_id;
        if (userId) {
          userInfoSource = 'pageData';
        }
      }
      
      // 方式2: 从全局数据中获取
      if (!userId && app.globalData.userInfo) {
        const globalUserInfo = app.globalData.userInfo;
        userId = globalUserInfo._id || globalUserInfo.openid || globalUserInfo.id || globalUserInfo.userId || globalUserInfo.user_id;
        if (userId) {
          userInfoSource = 'globalData';
        }
      }
      
      // 方式3: 从userStore中直接获取
      if (!userId && userStore.userInfo) {
        const storeUserInfo = userStore.userInfo;
        userId = storeUserInfo._id || storeUserInfo.openid || storeUserInfo.id || storeUserInfo.userId || storeUserInfo.user_id;
        if (userId) {
          userInfoSource = 'userStore';
        }
      }

      // 方式4: 从全局openid中获取（备选方案）
      if (!userId && app.globalData.openid) {
        userId = app.globalData.openid;
        userInfoSource = 'globalOpenid';
      }

      // 方式5: 使用临时ID（最后的备选方案）
      if (!userId) {
        // 生成一个基于时间戳的临时ID
        userId = 'temp_user_' + Date.now();
        userInfoSource = 'temporary';
        console.warn('⚠️ 使用临时用户ID:', userId);
        
        // 提示用户这是临时解决方案
        wx.showToast({
          title: '使用临时身份上传',
          icon: 'none',
          duration: 2000
        });
      }



      // 批量上传图片
      const uploadResult = await qiniuUploader.uploadImages(this.data.tempImages, userId, {
        pathType: 'post', // 设置为帖子类型
        onProgress: (index, progress) => {
          // 可以在这里处理上传进度
        }
      });

      if (!uploadResult.success) {
        console.error('部分图片上传失败:', uploadResult.errors);
        // 如果有部分成功，使用成功的结果
        if (uploadResult.results.length > 0) {
          const successImages = uploadResult.results.map(result => ({
            url: result.url,
            key: result.key,
            size: result.size || 0,
            hash: result.hash || '',
            uploadTime: result.uploadTime
          }));
          console.log('⚠️ 部分图片上传成功:', successImages);
          return successImages;
        } else {
          throw new Error('所有图片上传失败');
        }
      }

      // 提取所有成功上传的图片信息（包含URL和key）
      const uploadedImages = uploadResult.results.map(result => ({
        url: result.url,
        key: result.key,
        size: result.size || 0,
        hash: result.hash || '',
        uploadTime: result.uploadTime
      }));
      
      console.log('📸 上传完成，图片信息:', uploadedImages);
      return uploadedImages;
      
    } catch (error) {
      console.error('图片上传失败:', error);
      
      // 上传失败时的处理策略
      return new Promise((resolve, reject) => {
        wx.showModal({
          title: '图片上传失败',
          content: '是否继续发布（不包含图片）？',
          showCancel: true,
          cancelText: '取消发布',
          confirmText: '仅发布文字',
          success: (res) => {
            if (res.confirm) {
              resolve([]); // 用户选择继续发布，返回空数组
            } else {
              reject(new Error('用户取消发布'));
            }
          },
          fail: () => {
            reject(new Error('用户取消发布'));
          }
        });
      });
      
      // 如果是网络问题，提供重试选项
      if (error.message.includes('网络') || error.message.includes('请求失败')) {
        throw new Error('网络异常，请检查网络连接后重试');
      }
      
      throw error;
    } finally {
      wx.hideLoading();
    }
  },

  // 发布动态
  async publishPost() {
    console.log('🚀 开始发布帖子');
    
    // 验证输入
    if (!this.data.content.trim() && this.data.tempImages.length === 0) {
      util.showToast('请输入内容或选择图片');
      return;
    }

    // 验证登录状态 - 多重检查
    const app = getApp();
    const userStore = app.getUserStore();
    const isLoggedIn = this.data.isLoggedIn || 
                      app.globalData.loginStatus === 'loggedIn' || 
                      userStore.isLoggedIn;

    console.log('🔍 登录状态检查:', {
      pageIsLoggedIn: this.data.isLoggedIn,
      globalLoginStatus: app.globalData.loginStatus,
      storeIsLoggedIn: userStore.isLoggedIn,
      finalIsLoggedIn: isLoggedIn
    });

    if (!isLoggedIn) {
      util.showToast('请先登录');
      return;
    }

    if (this.data.isPublishing) {
      return; // 防止重复提交
    }

    this.setData({ isPublishing: true });

    try {
      wx.showLoading({ title: '发布中...', mask: true });

      // 上传图片（如果有的话）
      let uploadedImages = [];
      
      if (this.data.tempImages.length > 0) {
        console.log('📸 需要上传图片，开始上传...');
        try {
          uploadedImages = await this.uploadImages();
        } catch (uploadError) {
          console.error('📸 图片上传失败，继续发布流程:', uploadError);
          // 如果上传失败，继续发布流程（不包含图片）
          uploadedImages = [];
          
          // 提示用户图片上传失败，但帖子会继续发布
          setTimeout(() => {
            wx.showToast({
              title: '图片上传失败，已发布文字内容',
              icon: 'none',
              duration: 3000
            });
          }, 1000);
        }
      } else {
        console.log('📝 纯文字发布，跳过图片上传');
      }

      // 发布帖子
      const postData = {
        circleId: this.data.circleId,
        content: this.data.content.trim(),
        images: uploadedImages  // 现在包含完整的图片信息 {url, key, size, hash, uploadTime}
      };

      console.log('发布帖子数据:', postData);
      
      const response = await api.posts.create(postData);
      
      wx.hideLoading();
      util.showToast('发布成功');

      // 发布成功后返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);

    } catch (error) {
      wx.hideLoading();
      this.setData({ isPublishing: false });
      console.error('发布失败:', error);
      util.showToast('发布失败，请重试');
    }
  },

  // 返回上一页
  navigateBack() {
    // 如果有未保存的内容，给出提示
    if (this.data.content.trim() || this.data.tempImages.length > 0) {
      wx.showModal({
        title: '提示',
        content: '当前有未保存的内容，确定要离开吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  // 清空内容
  clearContent() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有内容吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            content: '',
            tempImages: []
          });
        }
      }
    });
  }
});