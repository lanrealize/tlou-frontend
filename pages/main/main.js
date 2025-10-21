// pages/main/main.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const api = require('../../utils/api');
const util = require('../../utils/util');
const navigationHelper = require('../../utils/navigationHelper');
const userStatus = require('../../utils/userStatus');

Page({
  // 使用MobX状态管理行为
  behaviors: [storeBindingsBehavior],
  
  data: {
    circles: [],          // 朋友圈列表
    recentCircle: null,   // 最新活动的朋友圈（用于首页卡片显示）
    currentCircleId: '',  // 当前选中的朋友圈ID
    posts: [],            // 帖子列表
    loading: false,       // 加载状态
    refreshing: false,    // 刷新状态
    hasMore: true,        // 是否还有更多数据
    showCommentInput: false,  // 是否显示评论输入框
    commentPostId: '',    // 当前评论的帖子ID
    commentText: '',      // 评论内容
    replyToUser: null,    // 回复的用户
    
    // 请求状态管理
    isLoadingCircles: false,    // 是否正在加载朋友圈
    lastCirclesLoadTime: 0,     // 上次加载朋友圈的时间戳
    circlesLoadThrottle: 3000,  // 节流时间（3秒）
    
    // 缓存机制
    cachedRecentCircle: null,   // 缓存的最新朋友圈数据
    lastRecentCircleHash: '',   // 上次朋友圈数据的哈希值
    recentCircleCacheConfig: {  // 缓存配置
      enabled: true,            // 是否启用缓存
      compareFields: ['_id', 'memberCount', 'formattedTime', 'createdAt', 'members'], // 对比字段
      cacheTimeout: 300000      // 缓存超时时间（毫秒），5分钟后强制更新
    },
    lastRecentCircleCacheTime: 0,  // 最后一次缓存时间
    hasInitialLoad: false,      // 是否已完成初始加载
    
    // 公开朋友圈推荐
    recommendedCircles: [],         // 推荐的公开朋友圈列表
    isLoadingRecommendations: false, // 是否正在加载推荐
    recommendationsLoaded: false,   // 是否已经加载过推荐内容（用于控制只在首次自动加载）
    
    // 朋友圈详情预加载相关
    isPreloadingCircle: false,      // 是否正在预加载朋友圈详情
    preloadingCircleId: '',         // 正在预加载的朋友圈ID
    preloadedCircleData: null,      // 预加载的朋友圈数据
    
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
    userInfoPopupCircleId: ''
  },

  onLoad(options) {
    
    // 获取安全区域信息
    this.getSafeAreaInfo();
    
    // 绑定MobX用户状态管理
    this.setupStoreBindings();
    
    // 注意：不再需要手动检查登录状态
    // MobX store会在app启动时自动检查
    // 这里通过storeBindings可以直接访问userStore的状态
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

  onUnload() {
    
    // 清理MobX绑定，防止内存泄漏
    if (this.storeBindings) {
      try {
        this.storeBindings.destroyStoreBindings();
        this.storeBindings = null;
      } catch (error) {
      }
    }

    // 清理其他可能的引用
    this.setData({
      circles: [],
      posts: [],
      currentCircleId: ''
    });
  },

  // 设置MobX Store绑定
  setupStoreBindings() {
    const app = getApp();
    const userStore = app.getUserStore();
    
    this.storeBindings = createStoreBindings(this, {
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
  },

  onShow() {
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
    
    // 🔧 确保登录状态检查完成后再加载数据（包括推荐朋友圈）
    // 注意：由于userInfo页面已改为弹出组件，不再需要检查prevPage
    this.waitForLoginCheckAndLoadData(null);
  },

  // 缓存工具方法
  
  // 生成朋友圈数据的简化哈希值（用于快速比较）
  generateRecentCircleHash(circleData) {
    if (!circleData) return '';
    
    const keyFields = [
      circleData._id,
      circleData.memberCount,
      circleData.formattedTime,
      circleData.createdAt,
      // 成员变化检测
      (circleData.members || []).map(m => m._id).sort().join(',')
    ];
    
    return keyFields.join('|');
  },
  
  // 比较两个朋友圈数据是否有实质性变化
  isRecentCircleChanged(newCircle, cachedCircle) {
    if (!newCircle && !cachedCircle) return false;
    if (!newCircle || !cachedCircle) return true;
    
    // 生成哈希值进行快速比较
    const newHash = this.generateRecentCircleHash(newCircle);
    const cachedHash = this.generateRecentCircleHash(cachedCircle);
    
    return newHash !== cachedHash;
  },
  
  // 更新最新朋友圈缓存
  updateRecentCircleCache(newCircle, forceUpdate = false) {
    const config = this.data.recentCircleCacheConfig;
    const now = Date.now();
    
    if (!newCircle) {
      this.setData({
        recentCircle: null,
        cachedRecentCircle: null,
        lastRecentCircleHash: '',
        lastRecentCircleCacheTime: 0
      });
      return true; // 表示更新了（清空）
    }
    
    // 检查是否禁用缓存或强制更新
    if (!config.enabled || forceUpdate) {
      this.setData({
        recentCircle: newCircle,
        cachedRecentCircle: JSON.parse(JSON.stringify(newCircle)),
        lastRecentCircleHash: this.generateRecentCircleHash(newCircle),
        lastRecentCircleCacheTime: now
      });
      return true;
    }
    
    // 检查缓存是否超时
    const cacheExpired = (now - this.data.lastRecentCircleCacheTime) > config.cacheTimeout;
    
    const newHash = this.generateRecentCircleHash(newCircle);
    const oldHash = this.data.lastRecentCircleHash;
    
    // 如果数据有变化或缓存已超时，才更新界面
    if (newHash !== oldHash || cacheExpired) {
      this.setData({
        recentCircle: newCircle,
        cachedRecentCircle: JSON.parse(JSON.stringify(newCircle)), // 深拷贝
        lastRecentCircleHash: newHash,
        lastRecentCircleCacheTime: now
      });
      
      return true; // 表示确实更新了
    }
    
    return false; // 表示没有更新
  },
  
  // 重置朋友圈缓存（用于强制刷新）
  resetRecentCircleCache() {
    this.setData({
      cachedRecentCircle: null,
      lastRecentCircleHash: '',
      lastRecentCircleCacheTime: 0,
      hasInitialLoad: false  // 重置初始加载标记，确保下次会显示loading
    });
  },

  // 🔧 等待登录检查完成后加载数据
  async waitForLoginCheckAndLoadData(prevPage) {
    const app = getApp();
    const userStore = app.getUserStore();
    
    // 如果用户状态还在加载中，等待加载完成
    if (userStore.isLoading) {
      // 最多等待3秒
      const maxWaitTime = 3000;
      const startTime = Date.now();
      
      while (userStore.isLoading && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 检查登录状态并加载用户朋友圈数据（需要登录）
    const shouldLoadData = userStore.isLoggedIn;
    
    if (shouldLoadData) {
      // 区分真正的数据修改操作和纯查看操作
      const isFromDataModifyPage = prevPage && (
        prevPage.route === 'pages/publish/publish' ||
        prevPage.route === 'pages/list/list'
      );
      
      // 从details页面返回时，只是查看操作，使用正常缓存机制
      const isFromDetailsPage = prevPage && prevPage.route === 'pages/details/details';
      
      if (isFromDataModifyPage) {
        // 如果是从可能修改数据的页面返回，强制刷新获取最新数据
        const isFromListPage = prevPage && prevPage.route === 'pages/list/list';
        if (isFromListPage) {
          setTimeout(() => {
            // 强制重置加载状态，确保不被节流阻止
            this.setData({ 
              isLoadingCircles: false,
              lastCirclesLoadTime: 0 
            });
            this.loadCirclesWithThrottle(true);
          }, 500);
        } else {
          this.loadCirclesWithThrottle(true);
        }
      } else if (isFromDetailsPage) {
        // 🔧 从详情页返回时的智能处理
        // 检查是否有有效的缓存数据且未超时
        const config = this.data.recentCircleCacheConfig;
        const cacheValid = this.data.cachedRecentCircle !== null;
        const cacheNotExpired = (Date.now() - this.data.lastRecentCircleCacheTime) <= config.cacheTimeout;
        const hasValidCache = cacheValid && cacheNotExpired;
        
        if (hasValidCache && this.data.hasInitialLoad) {
          // 有有效缓存且已完成初始加载，直接使用缓存，不发送请求
          console.log('🔧 从详情页返回，使用有效缓存，跳过请求');
          // 仅更新加载时间以符合节流逻辑，但不实际加载
          this.setData({
            lastCirclesLoadTime: Date.now()
          });
        } else {
          // 缓存无效或已过期，正常加载但不强制刷新
          console.log('🔧 从详情页返回，缓存无效，正常加载');
          this.loadCirclesWithThrottle(); // 不强制刷新，让缓存机制决定
        }
      } else {
        // 其他情况，正常加载
        this.loadCirclesWithThrottle();
      }
    }
    
    // 📌 公开朋友圈推荐加载（无需登录，任何用户都可以浏览）
    // 只在首次自动加载，之后需要用户手动点击刷新按钮
    if (!this.data.recommendationsLoaded) {
      this.loadRecommendations();
    }
  },

  // 用户登录/注册处理
  handleUserAuth() {
    // 根据当前状态执行不同的操作
    if (this.data.loginStatus === 'unregistered') {
      // 未注册状态，直接弹出用户信息组件
      const app = getApp();
      app.showUserInfoPopup({
        reason: '请完善您的个人信息'
      });
    } else if (this.data.hasError) {
      // 错误状态，提示用户重新启动
      wx.showModal({
        title: '登录状态异常',
        content: '当前登录状态出错，建议重新启动小程序',
        showCancel: true,
        cancelText: '重试',
        confirmText: '重启应用',
        success: (res) => {
          if (res.confirm) {
            // 重启小程序
            wx.reLaunch({ url: '/pages/main/main' });
          } else if (res.cancel) {
            // 重试恢复状态
            const app = getApp();
            const userStore = app.getUserStore();
            userStore.checkLoginStatus();
          }
        }
      });
    }
  },


  // ===== 创建朋友圈相关 =====
  


  // 直接创建朋友圈（无对话框，使用默认设置）
  async createCircleDirectly() {
    // 使用全局访问控制
    if (!userStatus.checkAccess('createCircle')) {
      return;
    }

    try {
      wx.showLoading({ title: '创建中...', mask: true });

      const data = {
        name: util.generateDefaultCircleName(),
        isPublic: false // 默认私密
      };

      const result = await api.circles.create(data);

      
      // 尝试获取新创建的朋友圈ID，支持多种可能的响应格式
      const newCircleId = result.data?.circle?._id || result.data?._id || result.circle?._id;

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });

      // 导航到朋友圈详情页面查看新创建的朋友圈
      setTimeout(() => {
        if (newCircleId) {
          wx.navigateTo({
            url: `/pages/details/details?circleId=${newCircleId}`
          });
        } else {
          // 如果没有获取到ID，导航到朋友圈管理页面
          wx.navigateTo({
            url: '/pages/list/list'
          });
        }
      }, 1000); // 延迟1秒让用户看到成功提示

    } catch (error) {
      wx.hideLoading();

      wx.showToast({ title: '创建失败', icon: 'error' });
    }
  },

  // 进入最新活动朋友圈详情页面
  goToRecentCircle() {
    // 使用全局访问控制
    if (!userStatus.checkAccess('enterListPage')) {
      return;
    }

    if (this.data.recentCircle && this.data.recentCircle._id) {
      this.preloadAndNavigateToCircleWithTimer(this.data.recentCircle._id);
    } else {
      util.showToast('朋友圈信息获取失败');
    }
  },

  // ===== 数据加载相关 =====

  // 刷新数据
  refreshData() {
    // 使用全局访问控制
    if (!userStatus.checkAccess('enterListPage')) {
      return;
    }

    // 重置缓存，确保强制更新
    this.resetRecentCircleCache();
    this.loadCirclesWithThrottle(true); // 强制刷新
  },

  // 刷新发现内容
  refreshDiscover() {
    wx.showToast({ title: '已刷新', icon: 'success' });
  },

  // 查看发现内容（需要登录）
  viewDiscover(e) {
    const { id } = e.currentTarget.dataset;
    
    // 使用全局访问控制
    if (!userStatus.checkAccess('enterListPage')) {
      return;
    }

    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // 带节流的加载朋友圈列表
  loadCirclesWithThrottle(forceRefresh = false) {
    const now = Date.now();
    const timeSinceLastLoad = now - this.data.lastCirclesLoadTime;
    
    // 如果正在加载中，跳过（除非强制刷新）
    if (this.data.isLoadingCircles && !forceRefresh) {
      return;
    }
    
    // 如果距离上次加载时间小于节流时间，且不是强制刷新，跳过
    if (timeSinceLastLoad < this.data.circlesLoadThrottle && !forceRefresh) {
      return;
    }
    
    // 传递强制更新参数给loadCircles
    this.loadCircles(0, forceRefresh);
  },

  // 加载朋友圈列表
  async loadCircles(retryCount = 0, forceUpdate = false) {
    // 检查多个状态源确保准确性
    const app = getApp();
    const userStore = app.getUserStore();
    const globalLoginStatus = app.globalData.loginStatus;
    
    const isLoggedIn = this.data.isLoggedIn || 
                      globalLoginStatus === 'loggedIn' || 
                      userStore.isLoggedIn;
    
    if (!isLoggedIn) {
      return;
    }

    // 🔧 优化loading显示逻辑：只有在真正需要时才显示loading
    const config = this.data.recentCircleCacheConfig;
    const cacheExpired = (Date.now() - this.data.lastRecentCircleCacheTime) > config.cacheTimeout;
    
    // 智能判断是否需要显示loading动画
    const shouldShowLoading = forceUpdate || // 强制刷新时显示
                              !config.enabled || // 缓存禁用时显示  
                              !this.data.hasInitialLoad || // 首次加载时显示
                              (cacheExpired && this.data.cachedRecentCircle === null); // 缓存过期且无缓存数据时显示
    
    if (shouldShowLoading) {
      this.setData({
        isLoadingCircles: true,
        lastCirclesLoadTime: Date.now()
      });
    } else {
      // 更新加载时间，但不显示loading
      this.setData({
        lastCirclesLoadTime: Date.now()
      });
    }

    try {
      const res = await api.circles.getMyParticipated();
      const circles = res.data.circles || [];
      
      // 后端已按最新活动时间排序，第一个就是最近活动的朋友圈
      const newRecentCircle = circles.length > 0 ? circles[0] : null;
      if (newRecentCircle) {
        // 格式化最新活动朋友圈的时间
        newRecentCircle.formattedTime = util.formatRelativeTime(newRecentCircle.createdAt);
        newRecentCircle.memberCount = newRecentCircle.members ? newRecentCircle.members.length : 0;
      }
      
      // 使用缓存机制，只有数据真正变化时才更新界面
      const wasUpdated = this.updateRecentCircleCache(newRecentCircle, forceUpdate);
      
      // 根据是否显示了loading来决定如何更新状态
      if (shouldShowLoading) {
        // 如果显示了loading，正常更新所有状态
        this.setData({ 
          circles,
          isLoadingCircles: false,
          hasInitialLoad: true  // 标记已完成初始加载
        });
      } else {
        // 如果没有显示loading，只更新circles，不触及loading状态
        this.setData({ 
          circles,
          hasInitialLoad: true  // 确保标记已完成初始加载
        });
      }
      
      // 如果有朋友圈且没有选中的朋友圈，默认选择第一个
      if (circles.length > 0 && !this.data.currentCircleId) {
        this.switchCircle(circles[0]._id);
      }
    } catch (error) {
      console.error('❌ 加载朋友圈失败:', error);
      
      // 处理429错误（请求过于频繁）
      if (error.message && error.message.includes('HTTP 429')) {
        console.log('⚠️ 检测到429错误，请求过于频繁');
        
        // 如果重试次数少于3次，等待后重试
        if (retryCount < 3) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避：1s, 2s, 4s
          console.log(`🔄 将在${retryDelay}ms后进行第${retryCount + 1}次重试`);
          
          setTimeout(() => {
            this.loadCircles(retryCount + 1, forceUpdate);
          }, retryDelay);
          
          // 显示用户友好的提示
          if (retryCount === 0) {
            util.showToast('请求过于频繁，正在重试...');
          }
          return;
        } else {
          util.showToast('网络繁忙，请稍后再试');
        }
      } else {
        util.showToast('加载朋友圈失败');
      }
      
      // 重置加载状态（只在显示了loading时才重置）
      if (shouldShowLoading) {
        this.setData({
          isLoadingCircles: false
        });
      }
    }
  },

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
    if (!userStatus.checkAccess('likePost')) {
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
    if (!userStatus.checkAccess('commentPost')) {
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
    if (!userStatus.checkAccess('commentPost')) {
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
      const data = {
        content: commentText.trim(),
        replyToUserId: replyToUser ? replyToUser.id : undefined,
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



  // 跳转到朋友圈管理（需要登录）
  goToCircleList() {
    // 使用全局访问控制
    if (!userStatus.checkAccess('enterListPage')) {
      return; // checkAccess 会自动处理跳转到登录页
    }
    
    wx.switchTab({
      url: '/pages/list/list'
    });
  },

  // 跳转到历史记录页面（需要登录）
  goToHistory() {
    // 使用全局访问控制
    if (!userStatus.checkAccess('enterListPage')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/list/list?mode=history'
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
    if (!userStatus.checkAccess('enterPublishPage')) {
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
          postImageUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || '');
        }
        
        this.setData({
          recommendedCircles: [{
            ...circle,
            formattedTime: util.formatRelativeTime(circle.createdAt),
            memberCount: circle.members ? circle.members.length : 0,
            hasLatestPost: !!(circle.latestPost && circle.latestPost.content),
            postImageUrl: postImageUrl
          }],
          recommendationsLoaded: true
        });
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
        // 复用格式化逻辑
        const circle = res.data.circle;
        
        let postImageUrl = '';
        if (circle.latestPost && circle.latestPost.images && circle.latestPost.images.length > 0) {
          const firstImage = circle.latestPost.images[0];
          postImageUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || '');
        }
        
        this.setData({
          recommendedCircles: [{
            ...circle,
            formattedTime: util.formatRelativeTime(circle.createdAt),
            memberCount: circle.members ? circle.members.length : 0,
            hasLatestPost: !!(circle.latestPost && circle.latestPost.content),
            postImageUrl: postImageUrl
          }],
          recommendationsLoaded: true
        });
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
    const startTime = Date.now();
    let showLoadingTimer = null;
    let isLoadingShown = false;

    try {
      // 设置1秒后显示loading的定时器
      showLoadingTimer = setTimeout(() => {
        if (!isLoadingShown) {
          this.setData({
            isPreloadingCircle: true,
            preloadingCircleId: circleId
          });
          isLoadingShown = true;
        }
      }, 1000);

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
      targetCircle.formattedTime = util.formatRelativeTime(targetCircle.createdAt);
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

      // 清除定时器
      if (showLoadingTimer) {
        clearTimeout(showLoadingTimer);
        showLoadingTimer = null;
      }

      // 确保数据完全设置后再跳转
      await new Promise(resolve => setTimeout(resolve, 100));

      // 预加载完成，跳转到详情页
      // 🔑 关键：如果有source参数，添加到URL中
      const sourceParam = source ? `&source=${source}` : '';
      wx.navigateTo({
        url: `/pages/details/details?circleId=${circleId}&preloaded=true${sourceParam}`
      });

    } catch (error) {
      // 清除定时器
      if (showLoadingTimer) {
        clearTimeout(showLoadingTimer);
        showLoadingTimer = null;
      }

      util.showToast('加载朋友圈失败');
      
      // 预加载失败，仍然跳转到详情页
      // 🔑 关键：如果有source参数，添加到URL中
      const sourceParam = source ? `&source=${source}` : '';
      wx.navigateTo({
        url: `/pages/details/details?circleId=${circleId}&preloadFailed=true${sourceParam}`
      });
    } finally {
      // 清理预加载状态
      if (isLoadingShown) {
        this.setData({
          isPreloadingCircle: false,
          preloadingCircleId: ''
        });
      }
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
    if (pendingIntent && circleId) {
      await this.handlePendingIntent(pendingIntent, circleId);
    } else {
      // 刷新页面数据
      this.loadCirclesWithThrottle(true);
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
      if (intentType === 'invited') {
        // 接受邀请并跳转到详情页
        await this.acceptInviteAndNavigate(circleId);
      } else if (intentType === 'can_apply') {
        // 申请加入并跳转到详情页
        await this.applyToJoinAndNavigate(circleId);
      }
    } catch (error) {
      console.error('处理意图失败:', error);
      util.showToast(error.message || '操作失败', 'error');
    }
  },
  
  // 接受邀请并跳转
  async acceptInviteAndNavigate(circleId) {
    const auth = require('../../utils/auth');
    const openid = await auth.getOpenid();
    
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
    const auth = require('../../utils/auth');
    const openid = await auth.getOpenid();
    
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

});