// pages/main/main.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const api = require('../../utils/api');
const util = require('../../utils/util');
const navigationHelper = require('../../utils/navigationHelper');
const { checkAndHandle } = require('../../utils/checkUserActionPermission');
const { circleStore, CIRCLE_STATUS } = require('../../store/circleStore');

// 🎬 视频动画状态机常量（定义在Page外部）
const VIDEO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  FADE_IN: 'fade_in',
  PLAYING: 'playing',
  FADE_OUT: 'fade_out'
};

// 🎬 视频动画配置（定义在Page外部）
const VIDEO_CONFIG = {
  CREATE_DELAY: 300,           // 创建视频元素延迟（ms）
  WAIT_BEFORE_FADE_IN: 2000,   // 等待2秒后淡入
  FADE_DURATION: 2000,         // 淡入/淡出动画时长（2秒）
  HIDE_FADE_DURATION: 500      // 页面隐藏时的快速淡出（500ms）
};

// 🎬 朋友圈卡片图片背景动画配置（完全复用视频时间线）
const IMAGE_BG_CONFIG = {
  CREATE_DELAY: 300,           // 创建图片元素延迟（ms）
  WAIT_BEFORE_FADE_IN: 2000,   // 等待2秒后淡入
  FADE_DURATION: 2000,         // 淡入动画时长（2秒）
  DISPLAY_DURATION: 3000,      // 显示时长（3秒）⚡ 减少2秒
  FADE_OUT_DURATION: 2000,     // 淡出动画时长（2秒）
  HIDE_FADE_DURATION: 500      // 页面隐藏时的快速淡出（500ms）
};

// 🎬 图片背景状态机（复用视频状态机）
const IMAGE_BG_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  FADE_IN: 'fade_in',
  DISPLAYING: 'displaying',
  FADE_OUT: 'fade_out'
};

Page({
  // 使用MobX状态管理行为
  behaviors: [storeBindingsBehavior],
  
  data: {
    // 🔧 注意：circles, recentCircle, isLoadingCircles, isUpdatingCircle, hasRecentCircle
    // 现在由 circleStore 管理，通过 MobX bindings 自动同步到页面
    
    currentCircleId: '',  // 当前选中的朋友圈ID
    posts: [],            // 帖子列表
    loading: false,       // 加载状态
    refreshing: false,    // 刷新状态
    hasMore: true,        // 是否还有更多数据
    showCommentInput: false,  // 是否显示评论输入框
    commentPostId: '',    // 当前评论的帖子ID
    commentText: '',      // 评论内容
    replyToUser: null,    // 回复的用户
    
    // 🖼️ 图片加载状态管理
    imageLoadStates: {},  // 图片加载状态对象 { 'avatar-main': 'loading'|'show'|'error' }
    
    // 公开朋友圈推荐
    recommendedCircles: [],         // 推荐的公开朋友圈列表
    isLoadingRecommendations: false, // 是否正在加载推荐
    recommendationsLoaded: false,   // 是否已经加载过推荐内容（用于控制只在首次自动加载）
    
    // 🎯 统一的全屏 Loading Overlay
    showLoadingOverlay: false,      // 是否显示 loading overlay
    loadingOverlayTitle: '',        // loading 标题
    loadingOverlaySubtitle: '',     // loading 副标题
    
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44,
      navBarHeight: 88,
      safeAreaTop: 44
    },
    
    // 用户信息弹出层
    userInfoPopupVisible: false,
    userInfoPopupReason: '',
    userInfoPopupIntent: '',
    userInfoPopupCircleId: '',
    
    // 🎬 空状态卡片视频动画
    emptyCardVideoState: 'idle',       // 视频状态: idle/loading/ready/fade_in/playing/fade_out
    showEmptyCardVideo: false,          // 是否显示视频元素
    emptyCardVideoVisible: false,       // 视频是否可见（透明度控制）
    emptyCardVideoFastFade: false,      // 是否使用快速淡出（页面隐藏时）
    
    // 🎬 朋友圈卡片图片背景动画（复用视频逻辑）
    circleCardImageState: 'idle',      // 图片状态: idle/loading/ready/fade_in/displaying/fade_out
    showCircleCardImage: false,         // 是否显示图片元素
    circleCardImageVisible: false,      // 图片是否可见（透明度控制）
    circleCardImageFastFade: false,     // 是否使用快速淡出（页面隐藏时）
    circleCardImageUrl: ''              // 当前显示的图片URL
  },
  
  // 🎬 视频动画定时器
  _allowVideoAnimation: false,
  _videoAnimationTimer: null,
  _createVideoTimer: null,
  _playVideoTimer: null,  // 淡入1秒后开始播放的定时器
  
  // 🎬 发现朋友圈首次加载标志
  _isFirstDiscoverLoad: true,
  
  // 🎬 朋友圈卡片图片背景定时器和索引
  _allowImageBgAnimation: false,
  _currentImageIndex: 0,           // 当前显示的图片索引
  _currentImageSessionId: null,    // 当前图片动画会话ID（circleId），用于验证数据有效性
  _lastDisplayedCircleId: null,    // 上次显示过的朋友圈ID，用于判断是否切换朋友圈
  _imageBgCreateTimer: null,       // 创建图片元素的定时器
  _imageBgFadeInTimer: null,       // 淡入定时器
  _imageBgDisplayTimer: null,      // 显示时长定时器
  _imageBgFadeOutTimer: null,      // 淡出定时器
  
  // 🎬 视频上下文
  _emptyCardVideoContext: null,

  onLoad(options) {
    // 获取安全区域信息
    this.getSafeAreaInfo();
    
    // 绑定MobX用户状态管理
    this.setupStoreBindings();
    
    // 注意：不再需要手动检查登录状态
    // MobX store会在app启动时自动检查
    // 这里通过storeBindings可以直接访问userStore的状态
  },

  // 🎯 统一的 Loading Overlay 控制方法
  
  /**
   * 显示全屏 Loading Overlay
   * @param {string} title - 标题文本
   * @param {string} subtitle - 副标题文本（可选）
   */
  showLoadingOverlayWithDelay(title = '加载中', subtitle = '马上就好...', delay = 1000) {
    // 清除之前的定时器
    if (this._loadingTimer) {
      clearTimeout(this._loadingTimer);
      this._loadingTimer = null;
    }
    
    // 设置延迟显示的定时器
    this._loadingTimer = setTimeout(() => {
      this.setData({
        showLoadingOverlay: true,
        loadingOverlayTitle: title,
        loadingOverlaySubtitle: subtitle
      });
      this._loadingTimer = null;
    }, delay);
  },
  
  /**
   * 隐藏全屏 Loading Overlay
   */
  hideLoadingOverlay() {
    // 清除定时器（如果还在等待中）
    if (this._loadingTimer) {
      clearTimeout(this._loadingTimer);
      this._loadingTimer = null;
    }
    
    // 隐藏 overlay
    this.setData({
      showLoadingOverlay: false,
      loadingOverlayTitle: '',
      loadingOverlaySubtitle: ''
    });
  },

  // 获取安全区域信息
  getSafeAreaInfo() {
    const navData = navigationHelper.getNavigationInfo();
    const app = getApp();
    
    // 安全地获取全局数据，如果全局数据不存在则使用当前 data 中的默认值
    const globalSafeArea = app.globalData.safeAreaInfo || {};
    
    this.setData({
      safeAreaInfo: {
        statusBarHeight: globalSafeArea.statusBarHeight || this.data.safeAreaInfo.statusBarHeight,
        navBarHeight: globalSafeArea.navBarHeight || this.data.safeAreaInfo.navBarHeight,
        safeAreaTop: globalSafeArea.statusBarHeight || this.data.safeAreaInfo.safeAreaTop,
        menuHeight: navData.menuHeight || 32,
        menuTop: navData.menuTop || 48,
        menuLeft: navData.menuLeft || 0,
        menuRight: navData.menuRight || 0
      }
    });
  },

  // ======================================================================
  // 🎬 朋友圈卡片图片背景动画控制（完全复用视频逻辑）
  // ======================================================================
  
  /**
   * 初始化朋友圈卡片图片背景动画
   * 在 onShow 中调用，检查是否有图片可显示
   */
  _initCircleCardImageBg() {
    // 检查是否有最近的朋友圈且有图片
    const recentCircle = this.data.recentCircle;
    if (!recentCircle || !recentCircle.latestPost || !recentCircle.latestPost.images || recentCircle.latestPost.images.length === 0) {
      console.log('🖼️ [图片背景] 没有可显示的图片');
      return;
    }
    
    // 清理可能残留的图片状态
    if (this.data.showCircleCardImage || this.data.circleCardImageState !== IMAGE_BG_STATES.IDLE) {
      this._stopCircleCardImageBg();
    }
    
    this._allowImageBgAnimation = false;
    this._resetCircleCardImageBgState();
    
    // 🎯 创建动画会话：保存完整的数据快照
    const sessionId = recentCircle._id;
    const imagesSnapshot = [...recentCircle.latestPost.images];  // 数组快照
    
    // 🔧 确保索引在有效范围内
    if (this._currentImageIndex >= imagesSnapshot.length) {
      console.log(`🖼️ [图片背景] 索引越界 [${this._currentImageIndex} >= ${imagesSnapshot.length}]，重置为0`);
      this._currentImageIndex = 0;
    }
    
    const imageIndex = this._currentImageIndex % Math.max(imagesSnapshot.length, 1);
    
    // 标记当前会话
    this._currentImageSessionId = sessionId;
    
    console.log(`🖼️ [图片背景] 启动会话 [session=${sessionId}, index=${imageIndex}/${imagesSnapshot.length}]`);
    
    // 延迟创建图片元素，等待小程序框架完成DOM更新
    this._imageBgCreateTimer = setTimeout(() => {
      // 🎯 验证会话仍然有效
      if (this._currentImageSessionId !== sessionId) {
        console.log(`🖼️ [图片背景] 会话已失效 [期望=${sessionId}, 当前=${this._currentImageSessionId}]`);
        return;
      }
      
      // 🎯 使用快照数据，不依赖当前状态
      const currentImage = imagesSnapshot[imageIndex];
      
      // 处理图片URL - 支持对象和字符串两种格式
      if (!currentImage) {
        console.log('🖼️ [图片背景] 图片数据无效，取消显示');
        return;
      }
      const imageUrl = typeof currentImage === 'string' ? currentImage : (currentImage.url || '');
      
      if (!imageUrl) {
        console.log('🖼️ [图片背景] 图片URL为空，取消显示');
        return;
      }
      
      console.log(`🖼️ [图片背景] 显示图片 [${imageIndex + 1}/${imagesSnapshot.length}]: ${imageUrl}`);
      
      this.setData({ 
        circleCardImageState: IMAGE_BG_STATES.LOADING, 
        showCircleCardImage: true,
        circleCardImageUrl: imageUrl
      }, () => {
        // 再次验证会话（防止setData期间切换）
        if (this._currentImageSessionId !== sessionId) {
          console.log('🖼️ [图片背景] setData完成后会话已失效，取消动画');
          this._stopCircleCardImageBg();
          return;
        }
        
        this._allowImageBgAnimation = true;
        // 图片加载完成后触发淡入动画
        this._triggerCircleCardImageBgAnimation();
      });
    }, IMAGE_BG_CONFIG.CREATE_DELAY);
  },
  
  /**
   * 触发图片背景淡入动画
   * 当图片元素创建完成后调用
   */
  _triggerCircleCardImageBgAnimation() {
    // 防重复触发：检查标志位、定时器、状态
    if (!this._allowImageBgAnimation || 
        this._imageBgFadeInTimer || 
        this.data.circleCardImageState !== IMAGE_BG_STATES.LOADING) {
      console.log('🖼️ [图片背景] 动画被阻止（防重复触发）');
      return;
    }
    
    // 保存当前会话ID用于后续验证
    const sessionId = this._currentImageSessionId;
    
    console.log('🖼️ [图片背景] 开始动画流程');
    this.setData({ circleCardImageState: IMAGE_BG_STATES.READY });
    
    // 等待2秒后开始淡入
    this._imageBgFadeInTimer = setTimeout(() => {
      if (!this._allowImageBgAnimation || this._currentImageSessionId !== sessionId) return;
      
      console.log('🖼️ [图片背景] 开始淡入（2秒）');
      this.setData({ 
        circleCardImageState: IMAGE_BG_STATES.FADE_IN, 
        circleCardImageVisible: true 
      });
      
      // 淡入完成后进入显示状态
      this._imageBgDisplayTimer = setTimeout(() => {
        if (!this._allowImageBgAnimation || this._currentImageSessionId !== sessionId) return;
        
        console.log('🖼️ [图片背景] 完全显示（保持5秒）');
        this.setData({ circleCardImageState: IMAGE_BG_STATES.DISPLAYING });
        
        // 显示5秒后开始淡出
        this._imageBgFadeOutTimer = setTimeout(() => {
          if (!this._allowImageBgAnimation || this._currentImageSessionId !== sessionId) return;
          
          console.log('🖼️ [图片背景] 开始淡出（2秒）');
          this._fadeOutCircleCardImageBg();
        }, IMAGE_BG_CONFIG.DISPLAY_DURATION);
      }, IMAGE_BG_CONFIG.FADE_DURATION);
      
      this._imageBgFadeInTimer = null;
    }, IMAGE_BG_CONFIG.WAIT_BEFORE_FADE_IN);
  },
  
  /**
   * 图片背景淡出动画
   * @param {number} duration - 淡出时长（毫秒），默认使用 FADE_OUT_DURATION
   */
  _fadeOutCircleCardImageBg(duration = IMAGE_BG_CONFIG.FADE_OUT_DURATION) {
    // 判断是否需要快速淡出
    const isFastFade = duration < IMAGE_BG_CONFIG.FADE_OUT_DURATION;
    
    this.setData({ 
      circleCardImageState: IMAGE_BG_STATES.FADE_OUT, 
      circleCardImageVisible: false,
      circleCardImageFastFade: isFastFade
    });
    
    // 淡出完成后回到初始状态并移除图片元素
    const fadeOutTimer = setTimeout(() => {
      this.setData({ 
        circleCardImageState: IMAGE_BG_STATES.IDLE, 
        showCircleCardImage: false,
        circleCardImageFastFade: false,
        circleCardImageUrl: ''
      });
      this._imageBgFadeOutTimer = null;
    }, duration);
    
    // 如果是快速淡出（页面隐藏），不保存定时器
    if (!isFastFade) {
      this._imageBgFadeOutTimer = fadeOutTimer;
    }
  },
  
  /**
   * 重置图片背景状态
   * 清理所有定时器并恢复初始状态
   */
  _resetCircleCardImageBgState() {
    this._clearAllImageBgTimers();
    this.setData({ 
      circleCardImageState: IMAGE_BG_STATES.IDLE, 
      showCircleCardImage: false, 
      circleCardImageVisible: false,
      circleCardImageFastFade: false,
      circleCardImageUrl: ''
    });
    this._allowImageBgAnimation = false;
    this._currentImageSessionId = null;  // 清理会话ID
  },
  
  /**
   * 停止图片背景动画
   * 页面隐藏时立即调用，清理资源
   */
  _stopCircleCardImageBg() {
    this._allowImageBgAnimation = false;
    this._currentImageSessionId = null;  // 清理会话ID
    this.setData({ 
      showCircleCardImage: false,
      circleCardImageVisible: false,
      circleCardImageState: IMAGE_BG_STATES.IDLE,
      circleCardImageFastFade: false,
      circleCardImageUrl: ''
    });
    this._clearAllImageBgTimers();
  },
  
  /**
   * 清理所有图片背景相关定时器
   */
  _clearAllImageBgTimers() {
    [this._imageBgCreateTimer, this._imageBgFadeInTimer, this._imageBgDisplayTimer, this._imageBgFadeOutTimer].forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    this._imageBgCreateTimer = null;
    this._imageBgFadeInTimer = null;
    this._imageBgDisplayTimer = null;
    this._imageBgFadeOutTimer = null;
  },
  
  /**
   * 优雅地停止图片背景动画（页面隐藏时调用）
   * 触发快速淡出动画后再清理资源
   */
  _gracefullyStopImageBgAnimation() {
    // 如果图片正在显示中（不是idle状态），触发快速淡出动画
    if (this.data.circleCardImageState !== IMAGE_BG_STATES.IDLE && 
        this.data.showCircleCardImage) {
      // 停止所有进行中的定时器
      this._clearAllImageBgTimers();
      this._allowImageBgAnimation = false;
      
      // 触发快速淡出（500ms）
      this._fadeOutCircleCardImageBg(IMAGE_BG_CONFIG.HIDE_FADE_DURATION);
    } else {
      // 如果本来就是idle状态，直接清理
      this._stopCircleCardImageBg();
    }
  },
  
  /**
   * 推进图片索引到下一张
   */
  _advanceImageIndex() {
    const recentCircle = this.data.recentCircle;
    if (!recentCircle || !recentCircle.latestPost || !recentCircle.latestPost.images) {
      return;
    }
    
    const images = recentCircle.latestPost.images;
    if (images.length > 0) {
      this._currentImageIndex = (this._currentImageIndex + 1) % images.length;
      console.log(`🖼️ [图片索引] 推进到: ${this._currentImageIndex} (总共 ${images.length} 张)`);
    }
  },
  
  onUnload() {
    
    // 清理MobX绑定，防止内存泄漏
    if (this.userStoreBindings) {
      try {
        this.userStoreBindings.destroyStoreBindings();
        this.userStoreBindings = null;
      } catch (error) {
      }
    }
    
    if (this.circleStoreBindings) {
      try {
        this.circleStoreBindings.destroyStoreBindings();
        this.circleStoreBindings = null;
      } catch (error) {
      }
    }

    // 清理其他可能的引用
    this.setData({
      posts: [],
      currentCircleId: '',
      imageLoadStates: {}  // 清理图片状态
    });
  },

  // ===== 🖼️ 图片加载状态管理方法 =====
  
  /**
   * 设置图片加载状态
   * @param {string} key - 图片标识符
   * @param {string} state - 状态: 'loading' | 'show' | 'error'
   */
  setImageLoadState(key, state) {
    this.setData({
      [`imageLoadStates.${key}`]: state
    });
  },
  
  // 头部用户头像加载事件
  onAvatarMainLoad() {
    this.setImageLoadState('avatar-main', 'show');
  },
  
  onAvatarMainError() {
    this.setImageLoadState('avatar-main', 'error');
  },
  
  // 朋友圈成员头像加载事件
  onAvatarSmall1Load() {
    this.setImageLoadState('avatar-small-1', 'show');
  },
  
  onAvatarSmall1Error() {
    this.setImageLoadState('avatar-small-1', 'error');
  },
  
  onAvatarSmall2Load() {
    this.setImageLoadState('avatar-small-2', 'show');
  },
  
  onAvatarSmall2Error() {
    this.setImageLoadState('avatar-small-2', 'error');
  },
  
  onAvatarSmall3Load() {
    this.setImageLoadState('avatar-small-3', 'show');
  },
  
  onAvatarSmall3Error() {
    this.setImageLoadState('avatar-small-3', 'error');
  },
  
  onAvatarSmall4Load() {
    this.setImageLoadState('avatar-small-4', 'show');
  },
  
  onAvatarSmall4Error() {
    this.setImageLoadState('avatar-small-4', 'error');
  },
  
  onAvatarSmall5Load() {
    this.setImageLoadState('avatar-small-5', 'show');
  },
  
  onAvatarSmall5Error() {
    this.setImageLoadState('avatar-small-5', 'error');
  },
  
  onAvatarMoreBgLoad() {
    this.setImageLoadState('avatar-more-bg', 'show');
  },
  
  onAvatarMoreBgError() {
    this.setImageLoadState('avatar-more-bg', 'error');
  },

  // 设置MobX Store绑定
  setupStoreBindings() {
    const app = getApp();
    const userStore = app.getUserStore();
    
    // 绑定userStore
    this.userStoreBindings = createStoreBindings(this, {
      store: userStore,
      fields: {
        // 绑定用户状态到页面data
        loginStatus: 'loginStatus',        // 'loggedIn' | 'unregistered' | 'error' | 'loading'
        userInfo: 'userInfo',              // 用户信息
        errorMessage: 'errorMessage',      // 错误消息
        isLoading: 'isLoading',            // 是否正在加载
        isLoggedIn: 'isLoggedIn',          // 是否已登录
        hasError: 'hasError',              // 是否有错误
        displayName: 'displayName',        // 用户显示名称
        avatarUrl: 'avatarUrl',            // 用户头像URL
        
        // 🎭 虚拟身份相关状态
        isAdmin: 'isAdmin',                // 是否为管理员
        isVirtualIdentity: 'isVirtualIdentity', // 是否为虚拟身份
        currentIdentityType: 'currentIdentityType', // 当前身份类型
        adminDisplayInfo: 'adminDisplayInfo'     // admin展示信息
      },
      actions: {
        // 绑定actions到页面方法
        performUserRegistration: 'performUserRegistration',
        logout: 'logout',
        
        // 🎭 虚拟身份管理方法
        loadVirtualUsers: 'loadVirtualUsers',
        switchToVirtualIdentity: 'switchToVirtualIdentity',
        switchToRealIdentity: 'switchToRealIdentity',
        createVirtualUser: 'createVirtualUser'
      }
    });
    
    // 绑定circleStore
    this.circleStoreBindings = createStoreBindings(this, {
      store: circleStore,
      fields: {
        // 绑定朋友圈状态到页面data
        circleStatus: 'status',                   // 朋友圈加载状态
        recentCircle: 'recentCircle',             // 最近活动的朋友圈
        isLoadingCircles: 'isLoading',            // 是否正在加载
        isUpdatingCircle: 'isUpdating',           // 朋友圈卡片是否正在更新（用于动画）
        isEmptyCardUpdating: 'isEmptyCardUpdating', // 空状态卡片是否正在更新（用于动画）
        isRefreshing: 'isRefreshing',             // 是否正在刷新（显示旋转icon）
        isUpdatingCircleLine1: 'isUpdatingCircleLine1', // 第2行（时间）是否正在更新
        isUpdatingCircleLine2: 'isUpdatingCircleLine2', // 第3行（成员）是否正在更新
        hasRecentCircle: 'hasRecentCircle'        // 是否有最近朋友圈
      },
      actions: {
        // 绑定朋友圈actions
        loadRecentCircle: 'loadRecentCircle'
      }
    });
  },

  async onShow() {
    // 注册用户信息弹出层回调
    const app = getApp();
    app.registerUserInfoPopupCallback((config) => {
      this.setData({
        userInfoPopupVisible: config.visible,
        userInfoPopupReason: config.rejectReason,
        userInfoPopupIntent: config.pendingIntent,
        userInfoPopupCircleId: config.circleId
      });
    });
    
    // 始终检查一次用户状态，以防状态不同步
    const userStore = app.getUserStore();
    const globalUserInfo = app.globalData.userInfo;
    const globalLoginStatus = app.globalData.loginStatus;
    
    // 如果全局状态和store状态不一致，同步一下
    if (globalLoginStatus === 'loggedIn' && globalUserInfo && 
        (userStore.loginStatus !== 'loggedIn' || !userStore.userInfo)) {
      const { USER_STATUS } = require('../../store/userStore');
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: globalUserInfo });
      
      // 🔧 立即设置朋友圈加载状态，避免状态空窗期
      this.setData({ isLoadingCircles: true });
    }
    
    // 🎯 智能加载逻辑：朋友圈和推荐并行，但视频等待朋友圈结果
    // 1. 并行加载数据（朋友圈和推荐同时请求）
    const circlePromise = this.waitForLoginCheckAndLoadData();
    
    // 2. 等待朋友圈加载完成，确定卡片类型
    await circlePromise;
    
    // 🔧 等待一个tick，确保MobX数据已完全同步到this.data
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 3. 如果是空状态卡片，再初始化视频
    // 设计意图：先显示空状态卡片（纯文字），用户看几秒后，视频再慢慢淡入
    if (this.data.loginStatus !== 'loggedIn' || !this.data.hasRecentCircle) {
      console.log('🎬 [main] 初始化空状态视频背景');
      this._initEmptyCardVideoAnimation();
    } else if (this.data.loginStatus === 'loggedIn' && this.data.hasRecentCircle) {
      // 4. 如果是朋友圈卡片，初始化图片背景
      // 设计意图：复用视频的时间线，先显示纯文字卡片，2秒后图片淡入
      console.log('🖼️ [main] 初始化朋友圈图片背景');
      
      // 🎯 智能索引推进：只在需要时推进
      const currentCircleId = this.data.recentCircle?._id;
      const lastDisplayedCircleId = this._lastDisplayedCircleId;
      
      if (currentCircleId !== lastDisplayedCircleId) {
        // 朋友圈切换了，重置索引到0
        console.log(`🖼️ [main] 朋友圈切换 [${lastDisplayedCircleId} → ${currentCircleId}]，重置索引`);
        this._currentImageIndex = 0;
        this._lastDisplayedCircleId = currentCircleId;
      } else {
        // 同一个朋友圈，推进索引
        console.log('🖼️ [main] 同一朋友圈，推进索引');
        this._advanceImageIndex();
      }
      
      this._initCircleCardImageBg();
    }
  },
  
  onHide() {
    // 页面隐藏时优雅淡出
    this._gracefullyStopVideoAnimation();
    this._gracefullyStopImageBgAnimation();
    
    // 立即重置图片状态（使用CSS的2秒过渡）
    if (this.data.circleCardImageVisible) {
      this.setData({
        circleCardImageVisible: false,
        showCircleCardImage: false
      });
    }
  },

  // 🔧 注意：旧的缓存工具方法已移除
  // 现在所有朋友圈数据管理和缓存逻辑都在 circleStore 中实现

  // 🔧 等待登录检查完成后加载数据
  async waitForLoginCheckAndLoadData() {
    const app = getApp();
    const userStore = app.getUserStore();
    
    // 等待应用初始化完成（包括首次登录检查）
    if (app.waitForInit) {
      await app.waitForInit();
    }
    
    // 🎯 并行加载：朋友圈和推荐同时请求，互不阻塞
    // 但返回朋友圈的 Promise，供调用方等待（推荐不阻塞）
    let circlePromise = Promise.resolve();
    
    if (userStore.isLoggedIn) {
      circlePromise = this.loadRecentCircle();  // 保存 Promise
    }
    
    // 📌 公开朋友圈推荐加载（无需登录，任何用户都可以浏览）
    // 只在首次自动加载，之后需要用户手动点击刷新按钮
    if (!this.data.recommendationsLoaded) {
      this.loadRecommendations();  // 并行执行，不阻塞
    }
    
    // 返回朋友圈加载的 Promise
    return circlePromise;
  },

  // ===== 创建朋友圈相关 =====
  


  // 直接创建朋友圈（无对话框，使用默认设置）
  async createCircleDirectly() {
    // 使用全局访问控制
    if (!checkAndHandle('createCircle')) {
      return;
    }

    try {
      // 🎯 使用统一的 loading overlay（1秒后显示）
      this.showLoadingOverlayWithDelay('创建朋友圈', '正在创建中...', 1000);

      const data = {
        name: util.generateDefaultCircleName(),
        isPublic: false // 默认私密
      };

      const result = await api.circles.create(data);

      // 尝试获取新创建的朋友圈ID，支持多种可能的响应格式
      const newCircleId = result.data?.circle?._id || result.data?._id || result.circle?._id;

      // 如果没有获取到ID，说明创建失败
      if (!newCircleId) {
        throw new Error('创建成功但未返回朋友圈ID');
      }

      // 导航到朋友圈详情页面查看新创建的朋友圈（直接跳转，不等待overlay消失）
      wx.navigateTo({
        url: `/pages/details/details?circleId=${newCircleId}&showCreateSuccess=true`,
        success: () => {
          // 跳转成功后隐藏overlay
          this.hideLoadingOverlay();
        },
        fail: () => {
          // 跳转失败也要隐藏
          this.hideLoadingOverlay();
        }
      });

    } catch (error) {
      // 隐藏 loading overlay
      this.hideLoadingOverlay();

      wx.showToast({ title: '创建失败', icon: 'error' });
    }
  },

  // 进入最新活动朋友圈详情页面
  goToRecentCircle() {
    // 使用全局访问控制
    if (!checkAndHandle('enterListPage')) {
      return;
    }

    if (this.data.recentCircle && this.data.recentCircle._id) {
      this.preloadAndNavigateToCircleWithTimer(this.data.recentCircle._id);
    } else {
      util.showToast('朋友圈信息获取失败');
    }
  },

  // ===== 数据加载相关 =====


  // 刷新发现内容
  refreshDiscover() {
    wx.showToast({ title: '已刷新', icon: 'success' });
  },

  // 查看发现内容（需要登录）
  viewDiscover(e) {
    const { id } = e.currentTarget.dataset;
    
    // 使用全局访问控制
    if (!checkAndHandle('enterListPage')) {
      return;
    }

    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // 🔧 注意：旧的 loadCirclesWithThrottle 和 loadCircles 方法已移除
  // 现在使用统一的 circleStore.loadRecentCircle()

  // 切换朋友圈
  switchCircle(circleId) {
    if (circleId === this.data.currentCircleId) return;
    
    this.setData({
      currentCircleId: circleId,
      posts: [],
      hasMore: true
    });
    
    this.loadPosts(circleId);
  },

  // 加载帖子列表
  async loadPosts(circleId, loadMore = false) {
    if (this.data.loading || !this.data.isLoggedIn) return;
    
    this.setData({ loading: true });
    
    try {
      const res = await api.posts.getList(circleId);
      const newPosts = res.data.posts || [];
      
      // 格式化时间
      newPosts.forEach(post => {
        post.formattedTime = util.formatRelativeTime(post.createdAt);
        // 使用用户_id检查点赞状态，与Store保持一致
        const userId = this.data.userInfo?._id;
        post.isLiked = post.likes && post.likes.includes(userId);
        
        // 格式化评论时间
        if (post.comments) {
          post.comments.forEach(comment => {
            comment.formattedTime = util.formatRelativeTime(comment.createdAt);
          });
        }
      });
      
      this.setData({
        posts: loadMore ? [...this.data.posts, ...newPosts] : newPosts,
        hasMore: newPosts.length > 0,
        loading: false
      });
    } catch (error) {
      console.error('加载帖子失败:', error);
      util.showToast('加载帖子失败');
      this.setData({ loading: false });
    }
  },

  // ===== 帖子交互相关 =====

  // 朋友圈选择器改变
  onCirclePickerChange(e) {
    const index = e.detail.value;
    const circleId = this.data.circles[index]._id;
    this.switchCircle(circleId);
  },

  // 点赞/取消点赞（需要登录）
  async toggleLike(e) {
    const { postId, index } = e.currentTarget.dataset;
    
    // 使用全局访问控制
    if (!checkAndHandle('likePost')) {
      return;
    }

    try {
      const res = await api.posts.like(postId);
      const liked = res.data.liked;
      
      // 更新本地数据 - 使用_id而不是openid保持一致性
      const posts = [...this.data.posts];
      posts[index].isLiked = liked;
      
      // 使用用户_id进行点赞状态管理，与Store保持一致
      const userId = this.data.userInfo?._id;
      const userInfo = this.data.userInfo;
      
      if (liked) {
        posts[index].likes = posts[index].likes || [];
        posts[index].likedUsers = posts[index].likedUsers || [];
        // 确保不重复添加
        if (!posts[index].likes.includes(userId)) {
          posts[index].likes.push(userId);
        }
        // 同时更新likedUsers数组
        if (!posts[index].likedUsers.some(user => user._id === userId)) {
          posts[index].likedUsers.push({
            _id: userInfo._id,
            username: userInfo.username,
            avatar: userInfo.avatar
          });
        }
      } else {
        // 取消点赞：同时更新 likes 和 likedUsers
        posts[index].likes = posts[index].likes.filter(id => id !== userId);
        posts[index].likedUsers = posts[index].likedUsers.filter(user => user._id !== userId);
        
        // 🔧 修复：确保当取消点赞后，如果数组为空，进行清理
        if (posts[index].likedUsers.length === 0) {
          posts[index].likes = [];
        }
        if (posts[index].likes.length === 0) {
          posts[index].likedUsers = [];
        }
      }
      
      this.setData({ posts });
      
      util.showToast(liked ? '点赞成功' : '取消点赞');
    } catch (error) {
      console.error('点赞操作失败:', error);
      util.showToast('操作失败');
    }
  },

  // 显示评论输入框（需要登录）
  showCommentInput(e) {
    const { postId } = e.currentTarget.dataset;
    
    // 使用全局访问控制
    if (!checkAndHandle('commentPost')) {
      return;
    }

    this.setData({
      showCommentInput: true,
      commentPostId: postId,
      commentText: '',
      replyToUser: null
    });
  },

  // 回复评论（需要登录）
  replyComment(e) {
    const { postId, userId, username } = e.currentTarget.dataset;
    
    // 使用全局访问控制
    if (!checkAndHandle('commentPost')) {
      return;
    }

    this.setData({
      showCommentInput: true,
      commentPostId: postId,
      commentText: '',
      replyToUser: { id: userId, username }
    });
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  // 发送评论（需要登录）
  async sendComment() {
    if (!this.data.isLoggedIn || this.data.isLoading) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const { commentPostId, commentText, replyToUser } = this.data;
    
    if (util.isEmpty(commentText)) {
      util.showToast('请输入评论内容');
      return;
    }

    try {
      // ✅ 后端参数名：replyToUserOpenid
      const data = {
        content: commentText.trim(),
        replyToUserOpenid: replyToUser ? replyToUser.id : undefined,
        replyToUsername: replyToUser ? replyToUser.username : undefined
      };
      
      // 使用postStore的addComment方法，确保数据更新一致性
      await this.addComment(commentPostId, data);
      
      util.showToast('评论成功');
      
      // 隐藏输入框并清空内容
      this.setData({
        showCommentInput: false,
        commentText: '',
        replyToUser: null
      });
      
    } catch (error) {
      console.error('发表评论失败:', error);
      util.showToast('评论失败');
    }
  },

  // 取消评论
  cancelComment() {
    this.setData({
      showCommentInput: false,
      commentText: '',
      replyToUser: null
    });
  },

  // 预览图片
  previewImage(e) {
    const { current, urls } = e.currentTarget.dataset;
    util.previewImage(current, urls);
  },



  // 跳转到朋友圈列表页面（需要登录）
  goToHistory() {
    // 使用全局访问控制
    if (!checkAndHandle('enterListPage')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/list/list'
    });
  },

  // 🎭 管理员功能 - 跳转到管理页面
  goToManagement() {
    const app = getApp();
    const userStore = app.getUserStore();

    // 使用UserStore的状态进行权限检查（更可靠）
    const hasAdminPermission = userStore.isAdmin;
    const pageIsAdmin = this.data.isAdmin;

    // 如果UserStore有权限但页面状态没同步，手动同步
    if (hasAdminPermission && pageIsAdmin !== hasAdminPermission) {
      this.setData({
        isAdmin: hasAdminPermission,
        userInfo: userStore.userInfo,
        loginStatus: userStore.loginStatus
      });
    }

    // 使用UserStore的状态进行最终权限检查
    if (!hasAdminPermission) {
      wx.showToast({ 
        title: '需要管理员权限', 
        icon: 'error',
        duration: 2000
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/management/management'
    });
  },

  // 删除帖子（需要登录）
  async deletePost(e) {
    const { postId, index } = e.currentTarget.dataset;
    
    // 使用全局访问控制
    if (!checkAndHandle('enterPublishPage')) {
      return;
    }

    const confirm = await util.showConfirm('确定要删除这条动态吗？');
    if (!confirm) return;
    
    try {
      await api.posts.delete(postId);
      
      // 从列表中移除
      const posts = [...this.data.posts];
      posts.splice(index, 1);
      this.setData({ posts });
      
      util.showToast('删除成功');
    } catch (error) {
      console.error('删除帖子失败:', error);
      util.showToast('删除失败');
    }
  },

  // === 公开朋友圈推荐功能 ===
  
  // 加载随机公开朋友圈推荐
  // 📌 公开朋友圈推荐策略：无需登录，任何用户都可以浏览
  async loadRecommendations() {
    if (this.data.isLoadingRecommendations) {
      return;
    }

    this.setData({ isLoadingRecommendations: true });

    try {
      // 调用公开API获取单个公开朋友圈（支持未登录用户）
      const res = await api.circles.getRandomPublicCircle({
        excludeVisited: 'true'  // 排除已访问的朋友圈
      });

      if (res && res.success && res.data && res.data.circle) {
        const circle = res.data.circle;
        
        // 处理图片URL - 支持对象和字符串两种格式
        let postImageUrl = '';
        if (circle.latestPost && circle.latestPost.images && circle.latestPost.images.length > 0) {
          const firstImage = circle.latestPost.images[0];
          if (firstImage) {
            postImageUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || '');
          }
        }
        
        // 提取帖子作者头像（降级到创建者头像）
        const postAuthorAvatar = circle.latestPost?.author?.avatar 
                               || circle.creator?.avatar 
                               || '/images/default_avatar.png';
        
        const isInitialLoad = this._isFirstDiscoverLoad;
        
        // 🔧 优先使用 latestActivityTime（包含发帖/点赞/评论/加入等所有活动）
        const circleTime = circle.latestActivityTime || circle.createdAt;
        
        this.setData({
          recommendedCircles: [{
            ...circle,
            formattedTime: util.formatRelativeTime(circleTime),
            memberCount: circle.members ? circle.members.length : 0,
            hasLatestPost: !!(circle.latestPost && circle.latestPost.content),
            postImageUrl: postImageUrl,
            postAuthorAvatar: postAuthorAvatar,
            refreshTimestamp: Date.now(),
            isInitialLoad: isInitialLoad
          }],
          recommendationsLoaded: true
        });
        
        // 首次加载完成后立即标记
        if (this._isFirstDiscoverLoad) {
          this._isFirstDiscoverLoad = false;
        }
      } else {
        // 暂无可用的朋友圈（正常情况）
        this.setData({ 
          recommendedCircles: [],
          recommendationsLoaded: true
        });
      }
    } catch (error) {
      console.error('加载推荐朋友圈失败:', error);
      this.setData({ 
        recommendedCircles: [],
        recommendationsLoaded: true
      });
    } finally {
      this.setData({ isLoadingRecommendations: false });
    }
  },

  // 刷新推荐朋友圈（重置访问历史）
  async refreshRecommendations() {
    if (this.data.isLoadingRecommendations) {
      return;
    }

    this.setData({ isLoadingRecommendations: true });

    try {
      // 调用API并重置访问历史
      const res = await api.circles.getRandomPublicCircle({
        excludeVisited: 'true',
        resetHistory: 'true'  // 重置访问历史，获取新内容
      });

      if (res && res.success && res.data && res.data.circle) {
        const circle = res.data.circle;
        
        let postImageUrl = '';
        if (circle.latestPost && circle.latestPost.images && circle.latestPost.images.length > 0) {
          const firstImage = circle.latestPost.images[0];
          if (firstImage) {
            postImageUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || '');
          }
        }
        
        // 提取帖子作者头像（降级到创建者头像）
        const postAuthorAvatar = circle.latestPost?.author?.avatar 
                               || circle.creator?.avatar 
                               || '/images/default_avatar.png';
        
        const isInitialLoad = this._isFirstDiscoverLoad;
        
        // 🔧 优先使用 latestActivityTime（包含发帖/点赞/评论/加入等所有活动）
        const circleTime = circle.latestActivityTime || circle.createdAt;
        
        this.setData({
          recommendedCircles: [{
            ...circle,
            formattedTime: util.formatRelativeTime(circleTime),
            memberCount: circle.members ? circle.members.length : 0,
            hasLatestPost: !!(circle.latestPost && circle.latestPost.content),
            postImageUrl: postImageUrl,
            postAuthorAvatar: postAuthorAvatar,
            refreshTimestamp: Date.now(),
            isInitialLoad: isInitialLoad
          }],
          recommendationsLoaded: true
        });
        
        // 刷新时也标记（防止首次加载失败后刷新仍用初始动画）
        if (this._isFirstDiscoverLoad) {
          this._isFirstDiscoverLoad = false;
        }
      } else {
        // 暂无可推荐的朋友圈
        this.setData({ 
          recommendedCircles: [],
          recommendationsLoaded: true
        });
        util.showToast('暂无可推荐的朋友圈');
      }
    } catch (error) {
      console.error('刷新推荐朋友圈失败:', error);
      this.setData({ 
        recommendedCircles: [],
        recommendationsLoaded: true
      });
      util.showToast('刷新失败');
    } finally {
      this.setData({ isLoadingRecommendations: false });
    }
  },

  // 查看推荐的朋友圈（从发现页面进入，添加source参数）
  viewRecommendedCircle(e) {
    // 兼容新组件事件和原来的点击事件
    let circleId;
    if (e.detail && e.detail.circleId) {
      // 来自新组件的事件
      circleId = e.detail.circleId;
    } else if (e.currentTarget && e.currentTarget.dataset) {
      // 原来的点击事件
      circleId = e.currentTarget.dataset.circleId;
    }
    
    if (!circleId) {
      return;
    }
    
    // 🔑 优雅的解决方案：允许未登录用户查看，details 页面会处理权限
    this.preloadAndNavigateToCircleWithTimer(circleId, 'discover');
  },

  // 预加载朋友圈数据并跳转（带1秒延迟判断，支持source参数）
  async preloadAndNavigateToCircleWithTimer(circleId, source = '') {
    try {
      // 🎯 使用统一的 loading overlay（1秒后显示）
      this.showLoadingOverlayWithDelay('加载朋友圈', '正在加载中...', 1000);

      // 预加载朋友圈详情数据
      let targetCircle = null;
      const currentUser = this.data.currentUser || {};
      const isLoggedIn = currentUser && currentUser._id;
      
      // ✅ 优雅方案：API 层会自动判断调用认证API还是公开API
      
      // 已登录用户：先从我的朋友圈中查找
      if (isLoggedIn) {
        try {
          const circlesRes = await api.circles.getMy();
          targetCircle = circlesRes.data.circles.find(c => c._id === circleId);
        } catch (error) {
          console.log('📝 预加载：从我的朋友圈中未找到');
        }
      }
      
      // 如果没找到（或未登录），获取朋友圈详情
      // API 层会自动判断：已登录 → /circles/:id，未登录 → /public/circles/:id
      if (!targetCircle) {
        try {
          const detailRes = await api.circles.getDetail(circleId);
          targetCircle = detailRes.data.circle;
        } catch (error) {
          // 预加载失败不影响跳转，details 页面会处理
          console.log('📝 预加载失败（将由 details 页面处理）:', error.message);
        }
      }
      
      if (!targetCircle) {
        throw new Error('朋友圈不存在或无权访问');
      }

      // 格式化数据
      // 🔧 优先使用 latestActivityTime（包含发帖/点赞/评论/加入等所有活动）
      const circleTime = targetCircle.latestActivityTime || targetCircle.createdAt;
      targetCircle.formattedTime = util.formatRelativeTime(circleTime);
      targetCircle.memberCount = targetCircle.members ? targetCircle.members.length : 0;

      // 🔧 同时预加载帖子数据，避免details页面空白
      let preloadedPosts = [];
      try {
        // 检查用户权限（复制details页面的权限检查逻辑）
        const currentUser = this.data.currentUser || {};
        const canViewPosts = this.checkCanViewPosts(targetCircle, currentUser);
        
        if (canViewPosts) {
          // 直接调用 API 获取帖子，避免状态污染
          const postsRes = await api.posts.getList(circleId, { 
            page: 1, 
            limit: 20 
          });
          
          preloadedPosts = postsRes.data.posts || [];
        }
      } catch (error) {
        // 预加载帖子失败不影响整体流程
      }

      // 🔧 关键修改：直接在跳转前设置postStore数据，而不是存到globalData
      const { postStore, POST_STATUS } = require('../../store/postStore');
      
      // 设置朋友圈数据到全局（基本信息还是需要的）
      const app = getApp();
      app.globalData.preloadedCircleData = {
        circleId: circleId,
        circleData: targetCircle,
        timestamp: Date.now()
      };

      // 立即设置帖子数据到postStore，确保页面切换时数据已就绪
      if (preloadedPosts.length >= 0) {
        postStore.setStatus(POST_STATUS.LOADED, {
          posts: preloadedPosts,
          hasMore: preloadedPosts.length >= 20,
          page: 1
        });
        postStore.currentCircleId = circleId;
      }

      // 🎯 优化：直接跳转，不等待overlay消失
      // 新页面会立即覆盖，用户感受更流畅
      const sourceParam = source ? `&source=${source}` : '';
      wx.navigateTo({
        url: `/pages/details/details?circleId=${circleId}&preloaded=true${sourceParam}`,
        success: () => {
          // 跳转成功后立即隐藏overlay，避免返回时有残留
          this.hideLoadingOverlay();
        },
        fail: () => {
          // 跳转失败也要隐藏overlay
          this.hideLoadingOverlay();
        }
      });

    } catch (error) {
      // 🎯 隐藏 loading overlay
      this.hideLoadingOverlay();

      util.showToast('加载朋友圈失败');
      
      // 预加载失败，仍然跳转到详情页
      // 🔑 关键：如果有source参数，添加到URL中
      const sourceParam = source ? `&source=${source}` : '';
      wx.navigateTo({
        url: `/pages/details/details?circleId=${circleId}&preloadFailed=true${sourceParam}`
      });
    }
  },

  // 🔧 检查用户是否有权限查看朋友圈的帖子（复制自details页面的逻辑）
  checkCanViewPosts(circle, currentUser) {
    if (!circle) return false;
    
    // 公开朋友圈任何人都能看
    if (circle.isPublic) return true;
    
    // 如果用户未登录，只能看公开朋友圈
    if (!currentUser || !currentUser._id) return false;
    
    const userId = currentUser._id;
    
    // 🔧 修复：首先检查用户是否是创建者
    const creatorId = typeof circle.creator === 'object' ? circle.creator._id : circle.creator;
    const isOwner = creatorId === userId;
    
    // 检查用户是否是成员（通过数组）
    const isMemberByArray = circle.members && circle.members.some(member => {
      const memberId = typeof member === 'object' ? member._id : member;
      return memberId === userId;
    });
    
    // 🔧 关键修复：创建者自动是成员
    const isMember = isOwner || isMemberByArray;
    
    // 检查用户是否被邀请
    const isInvited = circle.invitees && circle.invitees.some(invitee => {
      const inviteeId = typeof invitee === 'object' ? invitee._id : invitee;
      return inviteeId === userId;
    });
    
    // 私密朋友圈只有成员和被邀请者可看
    return isMember || isInvited;
  },

  // === 用户信息弹出层相关方法 ===
  
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
    if (pendingIntent) {
      // 某些意图（如 createCircle）不需要 circleId
      await this.handlePendingIntent(pendingIntent, circleId);
    } else {
      // 刷新页面数据
      await this.loadRecentCircle();
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
      if (intentType === 'createCircle') {
        // 用户登录后继续创建朋友圈
        await this.createCircleDirectly();
      } else if (intentType === 'invited') {
        // 接受邀请并跳转到详情页
        await this.acceptInviteAndNavigate(circleId);
      } else if (intentType === 'can_apply') {
        // 申请加入并跳转到详情页
        await this.applyToJoinAndNavigate(circleId);
      } else {
        // 未知意图类型，记录日志但不影响用户体验
        console.warn(`未处理的意图类型: ${intentType}`);
        // 刷新页面数据作为降级处理
        await this.loadRecentCircle();
      }
    } catch (error) {
      console.error('处理意图失败:', error);
      util.showToast(error.message || '操作失败', 'error');
    }
  },
  
  // 接受邀请并跳转
  async acceptInviteAndNavigate(circleId) {
    const app = getApp();
    const userStore = app?.getUserStore();
    // ✅ 后端架构：_id 就是 openid 值
    const openid = userStore?.userInfo?._id;
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${api.getBaseUrl()}/circles/${circleId}/accept-invite`,
        method: 'POST',
        data: { openid },
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            util.showToast('已加入朋友圈', 'success');
            setTimeout(() => {
              wx.navigateTo({
                url: `/pages/details/details?circleId=${circleId}`
              });
            }, 1000);
            resolve(res.data);
          } else {
            reject(new Error(res.data?.message || '接受邀请失败'));
          }
        },
        fail: reject
      });
    });
  },
  
  // 申请加入并跳转
  async applyToJoinAndNavigate(circleId) {
    const app = getApp();
    const userStore = app?.getUserStore();
    // ✅ 后端架构：_id 就是 openid 值
    const openid = userStore?.userInfo?._id;
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${api.getBaseUrl()}/circles/${circleId}/apply`,
        method: 'POST',
        data: { openid },
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            util.showToast('申请已提交', 'success');
            setTimeout(() => {
              wx.navigateTo({
                url: `/pages/details/details?circleId=${circleId}`
              });
            }, 1000);
            resolve(res.data);
          } else {
            reject(new Error(res.data?.message || '申请失败'));
          }
        },
        fail: reject
      });
    });
  },
  
  // ========================================
  // 🎬 空状态卡片视频动画控制方法
  // ========================================
  
  /**
   * 初始化视频动画
   * 页面显示时调用，延迟创建视频元素并准备动画
   */
  _initEmptyCardVideoAnimation() {
    // 清理可能残留的视频状态
    if (this.data.showEmptyCardVideo || this.data.emptyCardVideoState !== VIDEO_STATES.IDLE) {
      this._stopEmptyCardVideoAnimation();
    }
    
    this._allowVideoAnimation = false;
    this._resetEmptyCardVideoState();
    
    // 延迟创建视频上下文，等待小程序框架完成DOM更新
    this._createVideoTimer = setTimeout(() => {
      this.setData({ 
        emptyCardVideoState: VIDEO_STATES.LOADING, 
        showEmptyCardVideo: true 
      }, () => {
        // 创建视频上下文（此时视频元素已渲染）
        this._emptyCardVideoContext = wx.createVideoContext('emptyCardVideo', this);
        this._allowVideoAnimation = true;
      });
    }, VIDEO_CONFIG.CREATE_DELAY);
  },
  
  /**
   * 触发视频淡入动画
   * 当视频准备就绪时调用（onVideoCanPlay事件）
   */
  _triggerEmptyCardVideoAnimation() {
    // 防重复触发：检查标志位、定时器、状态
    if (!this._allowVideoAnimation || 
        this._videoAnimationTimer || 
        this.data.emptyCardVideoState !== VIDEO_STATES.LOADING) {
      return;
    }
    
    // 标记为准备状态
    this.setData({ emptyCardVideoState: VIDEO_STATES.READY });
    
    // 等待2秒后开始淡入
    this._videoAnimationTimer = setTimeout(() => {
      this.setData({ 
        emptyCardVideoState: VIDEO_STATES.FADE_IN, 
        emptyCardVideoVisible: true 
      });
      
      // 淡入1秒后开始播放视频（淡入到一半）
      this._playVideoTimer = setTimeout(() => {
        if (this._emptyCardVideoContext) {
          this._emptyCardVideoContext.play();
        }
      }, VIDEO_CONFIG.FADE_DURATION / 2);  // 2秒淡入的一半 = 1秒
      
      // 淡入动画完成后进入播放状态
      this._videoAnimationTimer = setTimeout(() => {
        this.setData({ emptyCardVideoState: VIDEO_STATES.PLAYING });
        this._videoAnimationTimer = null;
      }, VIDEO_CONFIG.FADE_DURATION);
    }, VIDEO_CONFIG.WAIT_BEFORE_FADE_IN);
  },
  
  /**
   * 视频淡出动画
   * @param {number} duration - 淡出时长（毫秒），默认使用 FADE_DURATION
   */
  _fadeOutEmptyCardVideo(duration = VIDEO_CONFIG.FADE_DURATION) {
    // 判断是否需要快速淡出
    const isFastFade = duration < VIDEO_CONFIG.FADE_DURATION;
    
    this.setData({ 
      emptyCardVideoState: VIDEO_STATES.FADE_OUT, 
      emptyCardVideoVisible: false,
      emptyCardVideoFastFade: isFastFade  // 设置快速淡出标志
    });
    
    // 淡出完成后回到初始状态并移除视频元素
    this._videoAnimationTimer = setTimeout(() => {
      this.setData({ 
        emptyCardVideoState: VIDEO_STATES.IDLE, 
        showEmptyCardVideo: false,
        emptyCardVideoFastFade: false  // 重置快速淡出标志
      });
      this._videoAnimationTimer = null;
    }, duration);
  },
  
  /**
   * 重置视频状态
   * 清理所有定时器并恢复初始状态
   */
  _resetEmptyCardVideoState() {
    this._clearAllVideoTimers();
    this.setData({ 
      emptyCardVideoState: VIDEO_STATES.IDLE, 
      showEmptyCardVideo: false, 
      emptyCardVideoVisible: false,
      emptyCardVideoFastFade: false
    });
    this._allowVideoAnimation = false;
  },
  
  /**
   * 停止视频动画
   * 页面隐藏时立即调用，清理资源
   */
  _stopEmptyCardVideoAnimation() {
    this._allowVideoAnimation = false;
    this.setData({ 
      showEmptyCardVideo: false,
      emptyCardVideoVisible: false,
      emptyCardVideoState: VIDEO_STATES.IDLE,
      emptyCardVideoFastFade: false
    });
    this._clearAllVideoTimers();
  },
  
  /**
   * 清理所有视频相关定时器
   */
  _clearAllVideoTimers() {
    [this._videoAnimationTimer, this._createVideoTimer, this._playVideoTimer].forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    this._videoAnimationTimer = null;
    this._createVideoTimer = null;
    this._playVideoTimer = null;
  },
  
  /**
   * 优雅地停止视频动画（页面隐藏时调用）
   * 触发快速淡出动画后再清理资源
   */
  _gracefullyStopVideoAnimation() {
    // 如果视频正在显示中（不是idle状态），触发快速淡出动画
    if (this.data.emptyCardVideoState !== VIDEO_STATES.IDLE && 
        this.data.showEmptyCardVideo) {
      // 停止所有进行中的定时器
      this._clearAllVideoTimers();
      this._allowVideoAnimation = false;
      
      // 暂停视频播放
      if (this._emptyCardVideoContext) {
        this._emptyCardVideoContext.pause();
      }
      
      // 触发快速淡出（500ms）
      this._fadeOutEmptyCardVideo(VIDEO_CONFIG.HIDE_FADE_DURATION);
    } else {
      // 如果本来就是idle状态，直接清理
      this._stopEmptyCardVideoAnimation();
    }
  },
  
  /**
   * 视频事件：开始加载
   */
  onEmptyCardVideoLoadStart() {
    // 视频开始加载
  },
  
  /**
   * 视频事件：元数据加载完成
   */
  onEmptyCardVideoLoadedMetadata(e) {
    // 🔧 立即多次暂停，确保视频不会自动播放
    if (this._emptyCardVideoContext) {
      this._emptyCardVideoContext.pause();
      // 延迟再次暂停，以防首次暂停不生效
      setTimeout(() => {
        if (this._emptyCardVideoContext && this.data.emptyCardVideoState === VIDEO_STATES.LOADING) {
          this._emptyCardVideoContext.pause();
        }
      }, 50);
    }
    
    // 触发动画序列
    this._triggerEmptyCardVideoAnimation();
  },
  
  /**
   * 视频事件：视频可以播放
   */
  onEmptyCardVideoCanPlay() {
    // canplay时也暂停，确保视频不会自动播放
    if (this._emptyCardVideoContext && this.data.emptyCardVideoState === VIDEO_STATES.LOADING) {
      this._emptyCardVideoContext.pause();
      this._triggerEmptyCardVideoAnimation();
    }
  },
  
  /**
   * 视频事件：视频开始播放
   */
  onEmptyCardVideoPlay() {
    // 🔧 如果不是在 FADE_IN 或 PLAYING 状态，说明是意外播放，立即暂停
    if (this.data.emptyCardVideoState !== VIDEO_STATES.FADE_IN && 
        this.data.emptyCardVideoState !== VIDEO_STATES.PLAYING) {
      if (this._emptyCardVideoContext) {
        this._emptyCardVideoContext.pause();
      }
    }
  },
  
  /**
   * 视频事件：视频暂停
   */
  onEmptyCardVideoPause() {
    // 视频暂停事件
  },
  
  /**
   * 视频事件：视频缓冲中
   */
  onEmptyCardVideoWaiting() {
    // 视频缓冲事件
  },
  
  /**
   * 视频事件：视频播放结束
   */
  onEmptyCardVideoEnded() {
    // 只有在允许动画且处于播放状态时才淡出
    if (this._allowVideoAnimation && 
        this.data.emptyCardVideoState === VIDEO_STATES.PLAYING) {
      this._fadeOutEmptyCardVideo();
    }
  },
  
  /**
   * 视频事件：视频加载错误
   */
  onEmptyCardVideoError(e) {
    console.error('🎬 [空状态卡片] 视频加载失败:', e.detail);
    this._resetEmptyCardVideoState();
  },

});

// 🔧 通知 app：首页已注册完成（修复热重载白屏问题）
try {
  const app = getApp();
  if (app && app.notifyMainPageRegistered) {
    app.notifyMainPageRegistered();
  }
} catch (error) {
  // 首次加载时 getApp() 可能还未准备好，忽略错误
}