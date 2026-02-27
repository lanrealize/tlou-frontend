// components/publish-panel/publish-panel.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const api = require('../../utils/api');
const util = require('../../utils/util');
const { getCurrentUser, isUserLoggedIn, getCurrentUserId } = require('../../utils/checkUserActionPermission');

Component({
  behaviors: [storeBindingsBehavior],

  properties: {
    circleId: { type: String, value: '' },
    show: { type: Boolean, value: false },
    anonymousMode: { type: Boolean, value: false },
    initialImage: { type: String, value: '' },  // 预填充图片（onboarding 拍照传入）
  },

  observers: {
    'show': function(val) {
      if (val) {
        this.setData({ circleId: this.properties.circleId });
        if (!this.properties.anonymousMode) {
          this.loadCircleInfo();
        }
        this.setData({ userInfo: getCurrentUser(), isLoggedIn: isUserLoggedIn() });
        // 预填充 onboarding 拍摄的图片
        if (this.properties.initialImage) {
          this.setData({ tempImages: [this.properties.initialImage] });
        }
        setTimeout(() => this.setData({ slideIn: true }), 50);
      } else {
        this.setData({ slideIn: false });
      }
    }
  },

  data: {
    slideIn: false,
    circleId: '',
    circle: null,
    content: '',
    images: [],
    tempImages: [],
    isPublishing: false,
    maxImages: 9,
    violationDetails: null,
    showViolationAlert: false,
    violationTimeout: null,
    navigationData: { totalNavigationHeight: 88 },
    remainingTimeText: ''
  },

  lifetimes: {
    attached() {
      this.setupStoreBindings();
      this.getNavigationData();
    },
    detached() {
      if (this.storeBindings) this.storeBindings.destroyStoreBindings();
      if (this.violationTimer) clearTimeout(this.violationTimer);
      if (this.violationFinalTimer) clearTimeout(this.violationFinalTimer);
      if (this.countdownTimer) clearInterval(this.countdownTimer);
    }
  },

  pageLifetimes: {
    show() {
      this.setData({ userInfo: getCurrentUser(), isLoggedIn: isUserLoggedIn() });
    }
  },

  methods: {

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

  // 返回按钮处理
  goBack() {
    this.triggerEvent('close');
  },

  // 获取导航栏数据
  getNavigationData() {
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 44;
      const navigationBarHeight = 44;
      
      const navData = {
        statusBarHeight,
        navigationBarHeight,
        totalNavigationHeight: statusBarHeight + navigationBarHeight,
        windowWidth: systemInfo.windowWidth
      };
      
      this.setData({
        navigationData: navData
      });
    } catch (error) {
      console.error('获取导航栏数据失败:', error);
      // 使用默认值
      const navData = {
        statusBarHeight: 44,
        navigationBarHeight: 44,
        totalNavigationHeight: 88,
        windowWidth: 375
      };
      
      this.setData({
        navigationData: navData
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

      util.showToast('朋友圈信息加载失败');
      setTimeout(() => {
        this.triggerEvent('close');
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
      },
      fail: (err) => {
        // util.showToast('选择图片失败');
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
      
      // 已登录用户用 userId，未登录（trial 模式）用 Storage 里的 openid
      const userId = getCurrentUserId() || wx.getStorageSync('openid');

      // 如果没有获取到用户ID，说明用户未登录
      if (!userId) {
        console.error('❌ 获取用户ID失败：用户未登录');
        throw new Error('用户未登录，无法上传图片');
      }
      
      console.log('✅ 获取用户ID成功:', userId);


      // 获取本地图片尺寸信息
      const getImageInfo = (path) => new Promise((resolve) => {
        wx.getImageInfo({
          src: path,
          success: (res) => resolve({ width: res.width, height: res.height }),
          fail: () => resolve(null)
        });
      });

      const imageInfos = await Promise.all(
        this.data.tempImages.map(p => getImageInfo(p))
      );

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
          const successImages = uploadResult.results.map((result, idx) => {
            const info = imageInfos[idx];
            return {
              url: result.url,
              width: info?.width || null,
              height: info?.height || null
            };
          });
          console.log('⚠️ 部分图片上传成功:', successImages);
          return successImages;
        } else {
          throw new Error('所有图片上传失败');
        }
      }

      // 提取图片信息（URL + 尺寸）
      const uploadedImages = uploadResult.results.map((result, idx) => {
        const info = imageInfos[idx];
        return {
          url: result.url,
          width: info?.width || null,
          height: info?.height || null
        };
      });
      
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


    // 验证输入
    if (!this.data.content.trim() && this.data.tempImages.length === 0) {
      util.showToast('请输入内容或选择图片');
      return;
    }

    // anonymousMode 下跳过登录检查，走 trial 接口
    if (this.properties.anonymousMode) {
      return this._publishTrialPost();
    }

    // ✅ 修复：使用统一的登录状态检查函数
    const isLoggedIn = isUserLoggedIn();

    console.log('🔍 登录状态检查:', {
      isLoggedIn: isLoggedIn
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
      // 🚀 乐观更新：立即添加临时帖子到列表
      const { postStore } = require('../../store/postStore');
      const tempPostData = {
        content: this.data.content.trim(),
        tempImages: this.data.tempImages // 临时图片路径
      };
      
      const tempId = postStore.addOptimisticPost(this.data.circleId, tempPostData);
      console.log('🚀 临时帖子已添加，ID:', tempId);

      // 保存临时图片路径和内容，用于后台上传
      const contentToUpload = this.data.content.trim();
      const imagesToUpload = [...this.data.tempImages];
      const circleId = this.data.circleId;

      // 🎯 立即提示用户并返回上一页，不等待上传完成
      wx.showToast({
        title: '正在发布...',
        icon: 'loading',
        duration: 1500
      });

      // 立即返回上一页，让用户看到新帖子
      setTimeout(() => {
        // 设置全局标记，告诉 details 页面需要滚动到顶部
        const app = getApp();
        if (app.globalData) {
          app.globalData.shouldScrollToTopAfterPost = true;
        }

        this.triggerEvent('close', { published: true });

        // 🔥 在后台继续上传（不阻塞UI）
        this.uploadPostInBackground(tempId, circleId, contentToUpload, imagesToUpload, postStore);
      }, 500);

    } catch (error) {
      this.setData({ isPublishing: false });
      console.error('发布失败:', error);
      util.showToast(error.message || '发布失败，请重试');
    }
  },

  // 🆕 Trial 匿名发布流程（onboarding 专用）
  async _publishTrialPost() {
    if (this.data.isPublishing) return;
    this.setData({ isPublishing: true });

    try {
      // 1. 上传图片
      let uploadedImages = [];
      if (this.data.tempImages.length > 0) {
        uploadedImages = await this.uploadImages();
      }

      // 2. 创建试用朋友圈（后端自动创建 TempUser，已有则复用）
      const circleRes = await api.trial.createCircle();
      const circleId = circleRes.data.circle._id;

      // 3. 发帖
      const postRes = await api.trial.createPost({
        circleId,
        content: this.data.content.trim(),
        images: uploadedImages,
      });
      const post = postRes.data.post;

      // 4. 插入 postStore，让 details 页面立即看到帖子
      const { postStore } = require('../../store/postStore');
      postStore.prependPost(circleId, post);

      wx.showToast({ title: '发布成功', icon: 'success', duration: 1500 });
      setTimeout(() => {
        this.triggerEvent('close', { published: true, circleId });
      }, 500);

    } catch (error) {
      console.error('Trial 发布失败:', error);
      const msg = error?.response?.data?.message || error.message || '发布失败，请重试';
      util.showToast(msg);
    } finally {
      this.setData({ isPublishing: false });
    }
  },

  // 🚀 在后台上传帖子（不阻塞UI）
  async uploadPostInBackground(tempId, circleId, content, tempImages, postStore) {
    console.log('🔄 开始后台上传帖子...');
    
    try {
      // 上传图片（如果有的话）
      let uploadedImages = [];
      
      if (tempImages.length > 0) {
        console.log('📸 需要上传图片，开始上传...');
        
        try {
          // 重新设置数据以便uploadImages可以使用
          this.setData({ tempImages: tempImages });
          uploadedImages = await this.uploadImages();
          
          // 更新上传进度
          postStore.updatePostUploadProgress(tempId, 50);
          
        } catch (uploadError) {
          console.error('📸 图片上传失败:', uploadError);
          
          // 静默处理：如果图片上传失败，仍然尝试发布文字内容
          console.log('⚠️ 图片上传失败，尝试仅发布文字内容');
          uploadedImages = [];
        }
      }

      // 发布帖子到服务器
      const postData = {
        circleId: circleId,
        content: content,
        images: uploadedImages
      };

      console.log('📤 发送帖子数据到服务器...');
      const response = await api.posts.create(postData);
      
      console.log('✅ 服务器返回真实帖子数据:', response.data);
      
      // 更新进度到100%
      postStore.updatePostUploadProgress(tempId, 100);
      
      // 用真实帖子替换临时帖子
      if (response.data && response.data.post) {
        postStore.replaceOptimisticPost(tempId, response.data.post);
        console.log('✅ 帖子发布成功，临时帖子已替换为真实帖子');
        
        // 🖼️ 直接通知当前的 details 页面更新分享封面
        const pages = getCurrentPages();
        const detailsPage = pages.find(page => page.route === 'pages/details/details');
        if (detailsPage && typeof detailsPage.updateShareImage === 'function') {
          console.log('📸 通知 details 页面更新分享封面');
          detailsPage.updateShareImage();
        }
      }

    } catch (error) {
      console.error('❌ 后台上传失败:', error);
      
      // 🔍 检查是否是图片违规错误
      if (error.response?.status === 422 && error.response?.data?.violationDetails) {
        console.log('⚠️ 检测到图片违规，标记帖子失败（保持遮罩）');
        postStore.markPostUploadFailed(tempId, '图片内容不符合规范', true); // keepMask = true
        
        // 显示违规提示
        wx.showModal({
          title: '内容审核未通过',
          content: '检测到图片内容不符合平台规范，帖子发布失败。请修改后重新发布。',
          showCancel: false,
          confirmText: '我知道了'
        });
      } else {
        // 标记上传失败
        const errorMsg = error.message || '上传失败，请重试';
        postStore.markPostUploadFailed(tempId, errorMsg, false); // keepMask = false，移除遮罩
        
        // 显示错误提示
        wx.showToast({
          title: '发布失败',
          icon: 'none',
          duration: 2000
        });
      }
    } finally {
      // 重置发布状态
      this.setData({ isPublishing: false });
    }
  },

  // 🎯 方案二：通知details页面帖子数据已变更
  notifyDetailsPostChanged() {
    const pages = getCurrentPages();
    
    // 查找details页面实例
    const detailsPage = pages.find(page => 
      page.route.includes('details') && 
      page.data && page.data.circleId === this.data.circleId
    );
    
    if (detailsPage && typeof detailsPage.markDataNeedsRefresh === 'function') {
      console.log('📢 通知details页面帖子列表已更新');
      detailsPage.markDataNeedsRefresh();
    } else {
      console.log('⚠️ 未找到对应的details页面实例');
    }
    
    // 同时更新MobX Store状态（如果使用）
    try {
      const { postStore } = require('../../store/postStore');
      if (postStore && typeof postStore.markDataChanged === 'function') {
        postStore.markDataChanged('post_created', this.data.circleId);
      }
    } catch (error) {
      console.log('ℹ️ PostStore未启用markDataChanged方法');
    }
  },

  // 返回上一页
  navigateBack() {
    if (this.data.content.trim() || this.data.tempImages.length > 0) {
      wx.showModal({
        title: '提示',
        content: '当前有未保存的内容，确定要离开吗？',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('close');
          }
        }
      });
    } else {
      this.triggerEvent('close');
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
  },

  // 处理图片违规检查错误
  handleImageViolation(responseData) {
    console.log('图片违规检查失败:', responseData);
    
    const { violationDetails } = responseData;
    if (!violationDetails) return;

    // 设置违规超时时间（当前时间 + 超时分钟数）
    const timeoutMinutes = violationDetails.timeoutMinutes || 10;
    const violationTimeout = Date.now() + (timeoutMinutes * 60 * 1000);

    // 为每张图片添加违规状态标记
    const tempImagesWithStatus = this.data.tempImages.map((imagePath, index) => {
      const violatedImage = violationDetails.violatedImages.find(vi => vi.index === index + 1);
      return {
        path: imagePath,
        originalIndex: index,
        isViolated: !!violatedImage,
        violationReason: violatedImage?.reason || '',
        violationCode: violatedImage?.code || null
      };
    });

    this.setData({
      violationDetails,
      showViolationAlert: true,
      violationTimeout,
      tempImagesWithStatus
    });

    // 显示违规提示
    const violatedCount = violationDetails.violatedImages.length;
    const totalCount = violationDetails.totalImages;
    
    wx.showModal({
      title: '图片内容不符合规范',
      content: `很抱歉，检测到${violatedCount}张图片不符合平台内容规范。\n\n您可以：\n1. 手动删除红框标记的图片\n2. 点击"自动移除"按钮清理违规图片\n\n请注意：${timeoutMinutes}分钟后所有图片将被自动清理。`,
      showCancel: false,
      confirmText: '我知道了',
      success: () => {
        // 启动超时提醒
        this.startViolationTimeoutAlert(timeoutMinutes);
      }
    });
  },

  // 启动违规超时提醒
  startViolationTimeoutAlert(timeoutMinutes) {
    // 先清除之前的定时器
    if (this.violationTimer) {
      clearTimeout(this.violationTimer);
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    // 启动倒计时更新
    this.startCountdown();

    // 设置超时提醒（提前1分钟提醒）
    const alertTime = Math.max((timeoutMinutes - 1) * 60 * 1000, 30 * 1000); // 至少30秒后提醒
    
    this.violationTimer = setTimeout(() => {
      if (this.data.showViolationAlert) {
        wx.showToast({
          title: `图片将在1分钟后过期`,
          icon: 'none',
          duration: 3000
        });
      }
    }, alertTime);

    // 设置最终超时处理
    this.violationFinalTimer = setTimeout(() => {
      if (this.data.showViolationAlert) {
        this.handleViolationTimeout();
      }
    }, timeoutMinutes * 60 * 1000);
  },

  // 启动倒计时
  startCountdown() {
    this.updateRemainingTime();
    
    this.countdownTimer = setInterval(() => {
      if (this.data.showViolationAlert && this.data.violationTimeout) {
        this.updateRemainingTime();
      } else {
        clearInterval(this.countdownTimer);
      }
    }, 1000); // 每秒更新一次
  },

  // 更新剩余时间显示
  updateRemainingTime() {
    if (!this.data.violationTimeout) return;
    
    const now = Date.now();
    const remaining = Math.max(0, this.data.violationTimeout - now);
    
    if (remaining <= 0) {
      this.setData({ remainingTimeText: '已过期' });
      this.handleViolationTimeout();
      return;
    }
    
    const minutes = Math.floor(remaining / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
    
    this.setData({ 
      remainingTimeText: `${minutes}分${seconds}秒` 
    });
  },

  // 处理违规超时
  handleViolationTimeout() {
    wx.showModal({
      title: '图片已过期',
      content: '由于超过了处理时限，所有图片已被自动清理。\n\n您可以重新选择图片并发布帖子。',
      showCancel: false,
      confirmText: '重新开始',
      success: () => {
        this.setData({
          violationDetails: null,
          showViolationAlert: false,
          violationTimeout: null,
          tempImages: [],
          tempImagesWithStatus: [],
          remainingTimeText: ''
        });
      }
    });
  },

  // 删除违规图片
  deleteViolatedImage(e) {
    const { index } = e.currentTarget.dataset;
    const tempImagesWithStatus = this.data.tempImagesWithStatus;
    const tempImages = this.data.tempImages;
    
    // 删除指定索引的图片
    tempImagesWithStatus.splice(index, 1);
    tempImages.splice(index, 1);
    
    // 重新计算索引
    const updatedImagesWithStatus = tempImagesWithStatus.map((img, newIndex) => ({
      ...img,
      originalIndex: newIndex
    }));

    this.setData({
      tempImages,
      tempImagesWithStatus: updatedImagesWithStatus
    });

    // 如果没有违规图片了，隐藏违规提示
    const hasViolatedImages = updatedImagesWithStatus.some(img => img.isViolated);
    if (!hasViolatedImages) {
      this.clearViolationState();
    }
  },

  // 清除违规状态
  clearViolationState() {
    // 清除所有定时器
    if (this.violationTimer) {
      clearTimeout(this.violationTimer);
      this.violationTimer = null;
    }
    if (this.violationFinalTimer) {
      clearTimeout(this.violationFinalTimer);
      this.violationFinalTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.setData({
      violationDetails: null,
      showViolationAlert: false,
      violationTimeout: null,
      tempImagesWithStatus: [],
      remainingTimeText: ''
    });

    wx.showToast({
      title: '违规图片已清理',
      icon: 'success',
      duration: 2000
    });
  },

  // 重新发布（移除违规图片后）
  republishWithoutViolatedImages() {
    const nonViolatedImages = this.data.tempImagesWithStatus
      .filter(img => !img.isViolated)
      .map(img => img.path);
    
    this.setData({
      tempImages: nonViolatedImages
    });
    
    this.clearViolationState();

    // 重新调用发布
    this.publishPost();
  }
  }
});