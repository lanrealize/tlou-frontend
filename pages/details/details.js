// pages/details/details.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { when } = require('mobx-miniprogram');
const api = require('../../utils/api');
const util = require('../../utils/util');
const navigationHelper = require('../../utils/navigationHelper');
const { checkAndHandle } = require('../../utils/checkUserActionPermission');
const { ShareAnimationController, SHARE_ANIMATION_CONFIG } = require('./shareAnimationController');

Page({
  // 使用MobX状态管理行为
  behaviors: [storeBindingsBehavior],
  
  data: {
    circleId: '',         // 朋友圈ID
    circle: null,         // 朋友圈详情
    currentUser: {},      // 当前用户信息
    commentText: '',      // 评论内容
    replyToUser: null,    // 回复的用户
    selectedPostId: '',   // 当前选中的帖子ID（用于评论）
    isSendingComment: false, // 是否正在发送评论
    showCommentInput: false, // 是否显示评论输入框
    focusInput: false,    // 是否聚焦输入框
    scrollTopValue: 0,    // 滚动位置
    
    // 数据缓存相关
    lastDataLoadTime: 0,  // 上次数据加载时间
    needsDataRefresh: true, // 是否需要刷新数据
    
    // 🔧 帖子数据（确保字段存在，用于同步设置）
    posts: [],            // 帖子列表
    loading: false,       // 加载状态
    hasMore: true,        // 是否还有更多数据
    
    // 朋友圈不存在状态
    circleNotFound: false, // 朋友圈是否不存在
    
    // 用户信息弹出层
    userInfoPopupVisible: false,
    userInfoPopupReason: '',
    userInfoPopupIntent: '',
    userInfoPopupCircleId: '',
    
    // 🎬 分享入场动画 - 完整三步
    isFromShare: false,           // 是否从分享打开
    shareAnimationState: 'idle',  // 动画状态机：idle | ready | playing | transitioning | completed
    showShareAnimation: false,    // 是否显示动画容器
    hideFirstPostImage: false,    // 是否隐藏第一个帖子的图片（用于分享动画）
    shareAnimationClass: '',      // 动画容器类名
    shareGradientClass: '',       // 渐变遮罩类名
    shareAnimationImageUrl: '',   // 动画图片URL
    shareAnimationCompleted: false, // 动画是否完成
    shareAnimationEnabled: true,  // 🧪 动画开关（测试用，生产环境设为 true）
    shareAnimationTransform: '',  // 动画过渡的 CSS 变量
    transitionActive: false,      // 是否激活过渡动画
    showPublish: false,
    showOnboarding: null,  // 🎯 初始为 null，避免触发 CSS 显示逻辑
    onboardingInitialImage: '',  // onboarding 拍照后预填充到 publish-panel 的图片
    
    // 顶部间距（基于胶囊按钮位置计算）
    topSpacing: 0,  // 帖子列表顶部间距
  },

  onLoad(options) {
    this.setupStoreBindings();
    this.calculateTopSpacing();
    
    const { circleId, onboarding } = options;

    const showOnboarding = onboarding === 'true';

    // onboarding 模式下不需要 circleId（发布时动态创建）
    if (!circleId && !showOnboarding) {
      util.showToast('ID不能为空');
      wx.navigateBack();
      return;
    }

    console.log('[details] circleId:', circleId, 'onboarding:', showOnboarding);

    const isFromShare = false;
    
    // 🎬 创建动画控制器
    this.shareAnimationController = new ShareAnimationController(this);
    
    this.setData({
      circleId,
      isFromShare,
      showOnboarding,
      shareAnimationState: 'idle',
      showShareAnimation: false,
      hideFirstPostImage: false,
      shareAnimationClass: '',
      shareGradientClass: '',
      shareAnimationImageUrl: '',
      shareAnimationCompleted: false
    });

    // onboarding 模式下不加载任何朋友圈数据，等发布完成后再加载
    if (showOnboarding) return;

    // 加载朋友圈数据
    this.loadCircleDetail();
  },

  onUnload() {
    // 🎬 销毁动画控制器
    if (this.shareAnimationController) {
      this.shareAnimationController.destroy();
      this.shareAnimationController = null;
    }
    
    // 清理MobX绑定
    if (this.storeBindings) {
      this.storeBindings.destroyStoreBindings();
    }
    if (this.postStoreBindings) {
      this.postStoreBindings.destroyStoreBindings();
    }
  },



  // 设置MobX Store绑定
  setupStoreBindings() {
    const app = getApp();
    
    // 绑定用户Store
    const userStore = app.getUserStore();
    this.storeBindings = createStoreBindings(this, {
      store: userStore,
      fields: {
        userInfo: 'userInfo',
        currentUser: 'userInfo', // 直接绑定 currentUser 到 userInfo
        isLoggedIn: 'isLoggedIn'
      },
      actions: {}
    });

    // 绑定帖子Store
    const { postStore } = require('../../store/postStore');
    this.postStoreBindings = createStoreBindings(this, {
      store: postStore,
      fields: {
        posts: 'posts',
        loading: 'isLoadingPosts',
        hasMore: 'hasMore',
        errorMessage: 'errorMessage'
      },
      actions: {
        loadPostsRaw: 'loadPosts',
        refreshPostsRaw: 'refreshPosts',
        loadMorePostsRaw: 'loadMorePosts',
        toggleLike: 'toggleLike',
        addComment: 'addComment',
        deleteComment: 'deleteComment',
        deletePost: 'deletePost'
      }
    });
  },
  
  // 🆕 包装方法：自动传递参数
  async loadPosts(circleId, loadMore = false, extraParams = {}) {
    return this.loadPostsRaw(circleId, loadMore, extraParams);
  },
  
  async refreshPosts(circleId) {
    return this.refreshPostsRaw(circleId, {});
  },
  
  async loadMorePosts() {
    return this.loadMorePostsRaw({});
  },

  // 计算顶部间距（基于胶囊按钮位置）
  calculateTopSpacing() {
    try {
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      const { top, height } = menuButtonInfo;
      
      // 胶囊按钮底部位置 + 额外的 padding（例如 20px）
      const topSpacing = top + height + 20;
      
      this.setData({ topSpacing });
      console.log('📏 计算顶部间距:', topSpacing, 'px');
    } catch (error) {
      console.error('计算顶部间距失败:', error);
      // 使用默认值
      this.setData({ topSpacing: 88 });
    }
  },

  onShow() {
    console.log('📱 details 页面 onShow 被触发');

    // onboarding 模式：仅首次进入时播放动画，相机/panel 退出不重置
    if (this.data.showOnboarding && !this._onboardingAnimationStarted) {
      this._onboardingAnimationStarted = true;
      const guide = this.selectComponent('#onboarding-guide');
      if (guide) guide._startAnimation();
    }
    
    // 注册用户信息弹出层回调
    const app = getApp();
    app.registerUserInfoPopupCallback((config) => {
      this.setData({
        userInfoPopupVisible: config.visible,
        userInfoPopupReason: config.rejectReason,
        userInfoPopupIntent: config.pendingIntent,
        userInfoPopupCircleId: config.circleId || this.data.circleId
      });
    });
    
    // 检查是否需要在发帖后滚动到顶部
    if (app.globalData?.shouldScrollToTopAfterPost) {
      app.globalData.shouldScrollToTopAfterPost = false;
      // 发帖后不需要刷新（已经有乐观更新），只需要滚动到顶部
      console.log('📜 检测到发帖返回，直接滚动到顶部');
      this.scrollToTop();
    } else {
      // 智能刷新：基于场景和数据状态精确判断
      if (this.data.circleId) {
        this.intelligentRefreshData();
      }
    }
  },
  
  // 🎯 方案二：智能刷新数据 - 基于场景和数据状态精确判断
  intelligentRefreshData() {
    const now = Date.now();
    const { lastDataLoadTime, needsDataRefresh } = this.data;
    
    console.log('🔍 检查是否需要刷新，needsDataRefresh:', needsDataRefresh);
    
    // 分析刷新场景
    const refreshContext = this.analyzeRefreshContext();
    
    // 根据场景决定刷新策略
    if (refreshContext.shouldRefresh) {
      console.log('✅ 执行刷新，原因:', refreshContext.reason, '刷新类型:', refreshContext.refreshType);
      
      // 根据刷新类型执行相应的数据加载
      this.executeRefreshByType(refreshContext.refreshType);
      
      // 更新缓存标记
      this.setData({
        lastDataLoadTime: now,
        needsDataRefresh: false
      });
    } else {
      console.log('⏭️ 跳过刷新，原因:', refreshContext.skipReason);
    }
  },

  // 🎯 方案二：分析刷新场景
  analyzeRefreshContext() {
    const now = Date.now();
    const { lastDataLoadTime, needsDataRefresh, circle } = this.data;
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const prevPage = pages.length > 1 ? pages[pages.length - 2] : null;
    
    // 1. 强制刷新标记（来自其他页面的数据变更通知）
    if (needsDataRefresh) {
      return {
        shouldRefresh: true,
        refreshType: 'complete',
        reason: '检测到数据变更标记，执行完整刷新'
      };
    }
    
    // 2. 首次加载或数据缺失
    if (!lastDataLoadTime || !circle) {
      return {
        shouldRefresh: true,
        refreshType: 'complete',
        reason: '首次加载或数据缺失'
      };
    }
    
    // 3. 来源页面分析
    if (prevPage) {
      // 从发布页面返回（用户刚发布了内容）
      if (prevPage.route.includes('publish')) {
        return {
          shouldRefresh: true,
          refreshType: 'posts-only',
          reason: '从发布页面返回，刷新帖子列表'
        };
      }
      
      // 从用户信息页面返回（可能影响头像等）
      if (prevPage.route.includes('userInfo')) {
        return {
          shouldRefresh: true,
          refreshType: 'circle-only',
          reason: '从用户信息页面返回，刷新基础信息'
        };
      }
    }
    
    // 4. 时间维度判断 - 动态缓存时间
    const cacheTime = this.getAdaptiveCacheTime();
    const isDataExpired = (now - lastDataLoadTime) > cacheTime;
    
    if (isDataExpired) {
      return {
        shouldRefresh: true,
        refreshType: 'background',
        reason: `数据缓存过期（${Math.floor((now - lastDataLoadTime) / 1000)}秒前更新）`
      };
    }
    
    // 5. 默认情况：使用缓存
    return {
      shouldRefresh: false,
      skipReason: `使用缓存数据（${Math.floor((now - lastDataLoadTime) / 1000)}秒前更新）`
    };
  },

  // 🎯 方案二：自适应缓存时间
  getAdaptiveCacheTime() {
    const currentHour = new Date().getHours();
    
    // 活跃时段（9-22点）使用较短的缓存时间
    if (currentHour >= 9 && currentHour <= 22) {
      return 2 * 60 * 1000; // 2分钟
    } else {
      return 10 * 60 * 1000; // 10分钟
    }
  },

  // 🎯 方案二：根据类型执行刷新
  executeRefreshByType(refreshType) {
    switch (refreshType) {
      case 'complete':
        // 完整刷新：朋友圈信息 + 帖子列表
        this.loadCircleDetail();
        this.refreshPosts(this.data.circleId);
        break;
        
      case 'posts-only':
        // 仅刷新帖子列表
        this.refreshPosts(this.data.circleId);
        break;
        
      case 'circle-only':
        // 仅刷新朋友圈基础信息
        this.loadCircleDetail();
        break;
        
      case 'background':
        // 后台刷新：静默更新，不显示loading
        this.loadDataInBackground();
        break;
        
      default:
        this.loadCircleDetail();
        this.refreshPosts(this.data.circleId);
    }
  },

  // 🎯 方案二：后台静默刷新
  async loadDataInBackground() {
    try {
      // 并行加载，不显示loading状态
      await Promise.all([
        this.loadCircleDetail(),
        this.refreshPosts(this.data.circleId)
      ]);
    } catch (error) {
      // 静默失败，不影响用户体验
    }
  },
  
  // 标记数据需要刷新（供其他页面调用）
  markDataNeedsRefresh() {
    console.log('🔔 details 页面被标记需要刷新');
    this.setData({
      needsDataRefresh: true
    });
  },

  onScrollToComment(e) {
    const { commentTop, viewportHeight } = e.detail;
    const currentScrollTop = this._currentScrollTop || 0;
    const targetScrollTop = currentScrollTop + commentTop - viewportHeight / 2;
    this.setData({ scrollTopValue: Math.max(0, targetScrollTop) });
  },

  onScroll(e) {
    this._currentScrollTop = e.detail.scrollTop;
  },

  // 滚动到顶部
  scrollToTop() {
    console.log('📜 开始滚动到顶部');
    setTimeout(() => {
      this.setData({ scrollTopValue: 0 });
      console.log('✅ 设置 scrollTopValue = 0');
    }, 0);
  },

  // 下拉刷新（由于使用scroll-view，这个方法保留但不再使用）
  onPullDownRefresh() {
    Promise.all([
      this.loadCircleDetail(),
      this.refreshPosts(this.data.circleId)
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多（现在通过scroll-view的bindscrolltolower触发）
  onReachBottom() {
    this.loadMorePosts();
  },

  // 加载朋友圈详情
  async loadCircleDetail() {
    try {
      const { currentUser, circleId } = this.data;
      const isLoggedIn = currentUser && currentUser._id;
      
      let targetCircle = null;
      
      // 已登录用户：先从我的朋友圈中查找
      if (isLoggedIn) {
        try {
          const circlesRes = await api.circles.getMy();
          targetCircle = circlesRes.data.circles.find(c => c._id === circleId);
        } catch (error) {
          console.log('📝 从我的朋友圈中未找到，尝试获取详情');
        }
      }
      
      // 如果没找到，获取朋友圈详情
      if (!targetCircle) {
        try {
          const detailRes = await api.circles.getDetail(circleId, {});
          targetCircle = detailRes.data.circle;
        } catch (error) {
          this.handleCircleLoadError(error);
          return;
        }
      }
      
      if (!targetCircle) {
        throw new Error('内容不存在或无权访问');
      }

      // 格式化数据
      targetCircle.formattedTime = util.formatRelativeTime(targetCircle.createdAt);

      this.setData({
        circle: targetCircle
      });

      // 加载帖子
      await this.loadPosts(circleId, false);
      // 🎬 检查分享动画
      this.checkAndTriggerShareAnimation();

    } catch (error) {
      util.showToast('加载失败');
      
      // 如果加载失败，返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 智能返回：根据页面栈判断返回方式
  navigateBack() {
    const pages = getCurrentPages();
    
    if (pages.length >= 2) {
      // 有上一个页面，直接返回
      wx.navigateBack();
    } else {
      // 页面栈只有当前页，使用 reLaunch 回到首页
      wx.reLaunch({
        url: '/pages/main/main'
      });
    }
  },

  // 返回首页
  goToMainPage() {
    // 暂时关闭小程序
    wx.navigateBack();
  },

  // 点赞/取消点赞
  async onPostLike(e) {
    const { postId } = e.detail;

    // 权限检查：点赞需要注册
    if (!checkAndHandle('likePost', { circleId: this.data.circleId })) {
      return;
    }

    try {
      const result = await this.toggleLike(postId, this.data.userInfo);
      util.showToast(result.liked ? '点赞成功' : '取消点赞');
    } catch (error) {
      util.showToast('操作失败');
    }
  },

  // 评论
  onPostComment(e) {
    const { postId } = e.detail;

    // 权限检查：评论需要注册
    if (!checkAndHandle('commentPost', { circleId: this.data.circleId })) {
      return;
    }

    // 显示评论输入框
    this.setData({
      showCommentInput: true,
      selectedPostId: postId,
      replyToUser: null,
      commentText: '',
      focusInput: true
    });
  },

  // 回复评论
  onPostReplyComment(e) {
    const { postId, replyToUser } = e.detail;

    // 权限检查：回复需要注册
    if (!checkAndHandle('commentPost', { circleId: this.data.circleId })) {
      return;
    }

    // 显示评论输入框
    this.setData({
      showCommentInput: true,
      selectedPostId: postId,
      replyToUser,
      commentText: '',
      focusInput: true
    });
  },

  // 删除帖子
  async onPostDelete(e) {
    const { postId } = e.detail;

    const confirm = await util.showConfirm('确定要删除这条动态吗？');
    if (!confirm) return;

    try {
      await this.deletePost(postId);
      util.showToast('删除成功');
    } catch (error) {
      console.error('删除帖子失败:', error);
      util.showToast('删除失败');
    }
  },

  // 删除评论
  async onCommentDelete(e) {
    const { postId, commentId } = e.detail;

    const confirm = await util.showConfirm('确定要删除这条评论吗？');
    if (!confirm) return;

    try {
      await this.deleteComment(postId, commentId);
      util.showToast('删除成功');
    } catch (error) {
      console.error('删除评论失败:', error);
      util.showToast('删除失败');
    }
  },

  // 预览图片
  onPreviewImage(e) {
    const { current, urls } = e.detail;
    util.previewImage(current, urls);
  },

  // 点击用户头像
  onTapAvatar(e) {
    const { user } = e.detail;
    // 这里可以添加查看用户资料的逻辑
    util.showToast('功能开发中');
  },

  navigateToPublish() {
    // 权限检查：第二次发帖需要注册
    if (!checkAndHandle('publishPost', { circleId: this.data.circleId })) {
      return;
    }
    this.setData({ showPublish: true });
  },

  onOnboardingTakePhoto(e) {
    const { tempFilePath } = e.detail;
    this.setData({ showPublish: true, onboardingInitialImage: tempFilePath });
  },

  onPublishClose(e) {
    // onboarding 模式下，用户成功发布后退出引导层
    if (this.data.showOnboarding && e.detail && e.detail.published) {
      const newCircleId = e.detail.circleId;
      
      // 🎯 方案：先切换背景（onboarding → details），再隐藏 publish-panel
      // 这样 publish-panel 下滑时，背景已经是 details 了
      this.setData({ 
        showOnboarding: false, 
        circleId: newCircleId 
      });
      
      // 等待一帧，确保 DOM 更新完成
      setTimeout(() => {
        this.setData({ showPublish: false });
      }, 16);
      
      // 等待淡入动画完成后再加载数据（避免加载时的闪烁）
      setTimeout(() => {
        this.loadCircleDetail();
        this.refreshPosts(newCircleId);
      }, 100);
    } else {
      // 非 onboarding 模式，直接隐藏
      this.setData({ showPublish: false });
    }
  },

  // 评论输入
  onCommentInput(e) {
    const value = e.detail.value;
    this.setData({ 
      commentText: value 
    });
  },

  // 发送评论
  async sendComment() {
    const { commentText, replyToUser, selectedPostId, isSendingComment } = this.data;

    if (isSendingComment) return;

    if (util.isEmpty(commentText)) {
      util.showToast('请输入评论内容');
      return;
    }

    if (!selectedPostId) {
      util.showToast('未选择帖子');
      return;
    }

    this.setData({ isSendingComment: true });

    try {
      // ✅ 后端参数名：replyToUserOpenid
      const data = {
        content: commentText.trim(),
        replyToUserOpenid: replyToUser ? replyToUser.id : undefined,
        replyToUsername: replyToUser ? replyToUser.username : undefined
      };

      await this.addComment(selectedPostId, data);

      // 手动同步 postStore.posts 到页面 data，确保 post-item 收到更新
      const { postStore } = require('../../store/postStore');
      const plainPosts = JSON.parse(JSON.stringify(postStore.posts));
      this.setData({ posts: plainPosts });

      util.showToast('评论成功');

      // 隐藏输入框并清空内容
      this.setData({
        showCommentInput: false,
        commentText: '',
        replyToUser: null,
        selectedPostId: '',
        focusInput: false,
        isSendingComment: false
      });

    } catch (error) {
      util.showToast('评论失败');
      this.setData({ isSendingComment: false });
    }
  },

  // 取消评论
  cancelComment() {
    this.setData({
      showCommentInput: false,
      commentText: '',
      replyToUser: null,
      selectedPostId: '',
      focusInput: false
    });
  },

  // 预览图片
  previewImage(e) {
    const { current, urls } = e.currentTarget.dataset;
    util.previewImage(current, urls);
  },

  // 删除评论
  async deleteComment(e) {
    const { commentId, postId } = e.currentTarget.dataset;

    const confirm = await util.showConfirm('确定要删除这条评论吗？');
    if (!confirm) return;

    try {
      await api.posts.deleteComment(postId, commentId);

      util.showToast('删除成功');

      // 重新加载朋友圈详情
      this.loadCircleDetail();

    } catch (error) {
      console.error('删除评论失败:', error);
      util.showToast('删除失败');
    }
  },

  // 删除帖子
  async deletePost(e) {
    const { postId } = e.currentTarget.dataset;

    const confirm = await util.showConfirm('确定要删除这条动态吗？');
    if (!confirm) return;

    try {
      await api.posts.delete(postId);

      util.showToast('删除成功');

      // 重新加载朋友圈详情
      this.loadCircleDetail();

    } catch (error) {
      console.error('删除帖子失败:', error);
      util.showToast('删除失败');
    }
  },

  // 去登录（由组件触发）
  goToLogin() {
    const app = getApp();
    app.showUserInfoPopup({
      reason: '请完善您的个人信息'
    });
  },

  // 统一的朋友圈加载错误处理
  handleCircleLoadError(error) {
    console.error('加载失败:', error);
    
    // 显示全屏overlay
    this.setData({ circleNotFound: true });
  },

  // 用户信息注册成功
  async onUserInfoSuccess(e) {
    const { pendingIntent, circleId } = e.detail;
    
    // 关闭弹出层
    this.setData({
      userInfoPopupVisible: false
    });
    
    // 清除全局配置
    const app = getApp();
    app.clearUserInfoPopupConfig();
    
    // 如果有待处理的意图，执行相应操作
    if (pendingIntent && circleId) {
      await this.handlePendingIntent(pendingIntent, circleId);
    } else {
      // 刷新页面数据
      this.loadCircleDetail();
    }
  },
  
  // 用户信息取消
  onUserInfoCancel() {
    this.setData({
      userInfoPopupVisible: false
    });
    
    const app = getApp();
    app.clearUserInfoPopupConfig();
  },
  
  // 用户信息关闭（点击遮罩）
  onUserInfoClose() {
    this.setData({
      userInfoPopupVisible: false
    });
    
    const app = getApp();
    app.clearUserInfoPopupConfig();
  },
  
  // 处理待处理的意图
  async handlePendingIntent(intentType, circleId) {
    try {
      // AI-only 模式下，主要处理发帖、点赞、评论等意图
      if (intentType === 'publishPost') {
        // 打开发布面板
        this.setData({ showPublish: true });
      } else if (intentType === 'likePost' || intentType === 'commentPost') {
        // 点赞和评论意图：刷新页面，用户可以重新操作
        this.loadCircleDetail();
      }
    } catch (error) {
      console.error('处理意图失败:', error);
      util.showToast(error.message || '操作失败');
    }
  },

  // ===== 🎬 分享入场动画控制方法 =====

  /**
   * 全屏动画图片加载完成
   * @param {Object} e - 事件对象，包含图片尺寸信息
   */
  onShareAnimationImageLoad(e) {
    const { width, height } = e.detail;
    
    if (this.shareAnimationController) {
      this.shareAnimationController.setImageSize(width, height);
    }
  },

  /**
   * 🚫 阻止滑动操作（动画期间）
   */
  preventTouchMove(e) {
    return false;  // 阻止事件继续传播
  },

  /**
   * 🚫 阻止点击操作（动画期间）
   */
  preventTap(e) {
    return false;  // 阻止事件继续传播
  },

  /**
   * 🎬 取消分享动画
   */
  cancelShareAnimation() {
    this.setData({
      showShareAnimation: false,
      hideFirstPostImage: false,
      shareAnimationState: 'idle',
      shareAnimationClass: '',
      shareGradientClass: '',
      shareAnimationImageUrl: '',
      shareAnimationCompleted: false
    });
    this.shareAnimationController?.cancel();
  },

  /**
   * 检查并触发分享动画（使用 MobX Observable 模式 + ShareAnimationController）
   * 🎯 使用 MobX when() 监听 postStore 数据变化，优雅地等待数据就绪
   */
  async checkAndTriggerShareAnimation() {
    const { shareAnimationState, circleId } = this.data;
    
    // 只在 ready 状态时触发（所有判断已在 onLoad 中完成）
    if (shareAnimationState !== 'ready') {
      return;
    }
    
    // 🎯 使用 MobX when() Observable 模式等待数据就绪
    const { postStore, POST_STATUS } = require('../../store/postStore');
    
    try {
      // when() 会在条件满足时立即执行，或超时后拒绝
      // 等待数据加载完成（无论有没有帖子，只要加载完成就继续）
      await when(
        // 条件：数据加载完成（不再是 LOADING 状态）
        () => {
          return postStore.status !== POST_STATUS.LOADING;
        },
        {
          timeout: SHARE_ANIMATION_CONFIG.dataWait.TIMEOUT
        }
      );
      
      const posts = postStore.posts;
      
      // 检查第一个帖子是否有图片
      const firstPost = posts[0];
      
      if (!firstPost || !firstPost.images || firstPost.images.length === 0) {
        // 没有图片，不播放动画，直接取消（立即取消，不等2秒超时）
        this.cancelShareAnimation();
        return;
      }
      
      // 获取第一张图片URL
      const firstImage = firstPost.images[0];
      const imageUrl = typeof firstImage === 'object' ? firstImage.url : firstImage;
      
      // 🎬 记录动画播放（用于智能播放判断）
      recordShareAnimationPlay(circleId, this.shareTimestamp);
      
      // 🎬 使用动画控制器启动动画
      this.shareAnimationController?.start(imageUrl);
      
    } catch (error) {
      // 超时或其他错误（可能是网络问题）
      this.cancelShareAnimation();
    }
  }

});