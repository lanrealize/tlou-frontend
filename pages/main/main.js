// pages/main/main.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const api = require('../../utils/api');
const util = require('../../utils/util');
const navigationHelper = require('../../utils/navigationHelper');

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
    
    // 公开朋友圈推荐
    recommendedCircles: [],         // 推荐的公开朋友圈列表
    isLoadingRecommendations: false, // 是否正在加载推荐
    recommendationsLoaded: false,   // 是否已经加载过推荐内容（用于控制只在首次自动加载）
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44,
      navBarHeight: 88,
      safeAreaTop: 44
    }
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
    this.setData({
      safeAreaInfo: {
        statusBarHeight: app.globalData.safeAreaInfo.statusBarHeight,
        navBarHeight: app.globalData.safeAreaInfo.navBarHeight,
        safeAreaTop: app.globalData.safeAreaInfo.statusBarHeight,
        menuHeight: navData.menuHeight,
        menuTop: navData.menuTop,
        menuLeft: navData.menuLeft,
        menuRight: navData.menuRight
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
    
    // 检查是否从userInfo页面返回，如果是则刷新用户状态
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const prevPage = pages[pages.length - 2];
    
    if (prevPage && prevPage.route === 'pages/userInfo/userInfo') {
      // 刷新用户状态，检查是否注册成功
      const app = getApp();
      const userStore = app.getUserStore();
      userStore.checkLoginStatus();
    }
    
    // 始终检查一次用户状态，以防状态不同步
    const app = getApp();
    const userStore = app.getUserStore();
    const globalUserInfo = app.globalData.userInfo;
    const globalLoginStatus = app.globalData.loginStatus;
    
    // 如果全局状态和store状态不一致，同步一下
    if (globalLoginStatus === 'loggedIn' && globalUserInfo && 
        (userStore.loginStatus !== 'loggedIn' || !userStore.userInfo)) {
      const { USER_STATUS } = require('../../store/userStore');
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: globalUserInfo });
    }
    
    // 简化后：无需特殊的身份切换刷新逻辑，onShow会自然刷新
    
    // 🔧 确保登录状态检查完成后再加载数据
    this.waitForLoginCheckAndLoadData(prevPage);
    
    // 加载公开朋友圈推荐（需要登录才能查看）
    // 只在首次自动加载，之后需要用户手动点击刷新按钮
    if (!this.data.recommendationsLoaded && this.data.isLoggedIn) {
      this.loadRecommendations();
    }
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
    
    // 检查登录状态并加载数据
    const shouldLoadData = userStore.isLoggedIn;
    
    if (shouldLoadData) {
      // 检查是否从其他可能产生活动的页面返回，如果是则刷新获取最新排序
      const isFromInteractionPage = prevPage && (
        prevPage.route === 'pages/details/details' || 
        prevPage.route === 'pages/publish/publish' ||
        prevPage.route === 'pages/list/list'
      );
      
      if (isFromInteractionPage) {
        // 如果是从列表页返回，可能刚进行了交互操作，稍微延迟刷新
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
      } else {
        this.loadCirclesWithThrottle();
      }
      
      // 登录后加载推荐内容
      if (!this.data.recommendationsLoaded) {
        this.loadRecommendations();
      }
    }
  },

  // 用户登录/注册处理
  async handleUserAuth() {

    
    // 根据当前状态执行不同的操作
    if (this.data.loginStatus === 'unregistered' && !this.data.isLoading) {
      // 未注册状态，触发注册
      await this.performUserRegistration();
      
      // 注册成功后加载数据
      if (this.data.isLoggedIn) {
        this.loadCirclesWithThrottle(true); // 强制刷新
        // 登录成功后加载推荐内容
        if (!this.data.recommendationsLoaded) {
          this.loadRecommendations();
        }
      }
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

  // 需要登录的操作统一检查
  requireUserAuth(callback) {
    if (this.data.isLoggedIn && !this.data.isLoading) {
      // 已登录，直接执行操作
      callback && callback();
    } else if (this.data.loginStatus === 'unregistered' && !this.data.isLoading) {
      // 未注册，提示并引导注册
      wx.showModal({
        title: '需要登录',
        content: '该操作需要登录，是否现在登录？',
        success: (res) => {
          if (res.confirm) {
            this.handleUserAuth().then(() => {
              // 注册完成后执行原操作
              if (this.data.isLoggedIn) {
                callback && callback();
                // 登录成功后加载推荐内容
                if (!this.data.recommendationsLoaded) {
                  this.loadRecommendations();
                }
              }
            });
          }
        }
      });
    } else {
      // 其他状态，提示错误
      wx.showToast({
        title: this.data.errorMessage || '当前无法执行操作',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // ===== 创建朋友圈相关 =====
  


  // 直接创建朋友圈（无对话框，使用默认设置）
  async createCircleDirectly() {
    this.requireUserAuth(async () => {
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
    });
  },

  // 进入最新活动朋友圈详情页面
  goToRecentCircle() {
    this.requireUserAuth(() => {
      if (this.data.recentCircle && this.data.recentCircle._id) {
        wx.navigateTo({
          url: `/pages/details/details?circleId=${this.data.recentCircle._id}`
        });
      } else {
        util.showToast('朋友圈信息获取失败');
      }
    });
  },

  // ===== 数据加载相关 =====

  // 🔧 格式化朋友圈的图片数据，将对象格式转换为URL字符串
  formatCircleImages(circle) {
    if (circle.latestPost && circle.latestPost.images && Array.isArray(circle.latestPost.images)) {
      circle.latestPost.images = circle.latestPost.images.map(img => {
        if (typeof img === 'string') {
          return img; // 已经是URL字符串
        } else if (typeof img === 'object' && img.url) {
          return img.url; // 提取URL字符串
        } else {
          console.warn('⚠️ 无效的图片数据格式:', img);
          return null;
        }
      }).filter(url => url !== null); // 过滤掉无效的URL
    }
    return circle;
  },

  // 刷新数据
  refreshData() {
    this.requireUserAuth(() => {
      this.loadCirclesWithThrottle(true); // 强制刷新
    });
  },

  // 刷新发现内容
  refreshDiscover() {
    wx.showToast({ title: '已刷新', icon: 'success' });
  },

  // 查看发现内容（需要登录）
  viewDiscover(e) {
    const { id } = e.currentTarget.dataset;
    
    this.requireUserAuth(() => {
      console.log('查看发现内容:', id);
      wx.showToast({ title: '功能开发中', icon: 'none' });
    });
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
    
    this.loadCircles();
  },

  // 加载朋友圈列表
  async loadCircles(retryCount = 0) {
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

    // 设置加载状态
    this.setData({
      isLoadingCircles: true,
      lastCirclesLoadTime: Date.now()
    });

    try {
      const res = await api.circles.getMyParticipated();
      const circles = res.data.circles || [];
      
      // 后端已按最新活动时间排序，第一个就是最近活动的朋友圈
      const recentCircle = circles.length > 0 ? circles[0] : null;
      if (recentCircle) {
        // 格式化最新活动朋友圈的时间
        recentCircle.formattedTime = util.formatRelativeTime(recentCircle.createdAt);
        recentCircle.memberCount = recentCircle.members ? recentCircle.members.length : 0;
      }
      
      this.setData({ 
        circles,
        recentCircle,
        isLoadingCircles: false
      });
      
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
            this.loadCircles(retryCount + 1);
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
      
      // 重置加载状态
      this.setData({
        isLoadingCircles: false
      });
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
    
    this.requireUserAuth(async () => {
      try {
        const res = await api.posts.like(postId);
        const liked = res.data.liked;
        
        // 更新本地数据 - 使用_id而不是openid保持一致性
        const posts = [...this.data.posts];
        posts[index].isLiked = liked;
        
        // 使用用户_id进行点赞状态管理，与Store保持一致
        const userId = this.data.userInfo?._id;
        
        if (liked) {
          posts[index].likes = posts[index].likes || [];
          // 确保不重复添加
          if (!posts[index].likes.includes(userId)) {
            posts[index].likes.push(userId);
          }
        } else {
          posts[index].likes = posts[index].likes.filter(id => id !== userId);
        }
        
        this.setData({ posts });
        
        util.showToast(liked ? '点赞成功' : '取消点赞');
      } catch (error) {
        console.error('点赞操作失败:', error);
        util.showToast('操作失败');
      }
    });
  },

  // 显示评论输入框（需要登录）
  showCommentInput(e) {
    const { postId } = e.currentTarget.dataset;
    
    this.requireUserAuth(() => {
      this.setData({
        showCommentInput: true,
        commentPostId: postId,
        commentText: '',
        replyToUser: null
      });
    });
  },

  // 回复评论（需要登录）
  replyComment(e) {
    const { postId, userId, username } = e.currentTarget.dataset;
    
    this.requireUserAuth(() => {
      this.setData({
        showCommentInput: true,
        commentPostId: postId,
        commentText: '',
        replyToUser: { id: userId, username }
      });
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
    this.requireUserAuth(() => {
      wx.switchTab({
        url: '/pages/list/list'
      });
    });
  },

  // 跳转到历史记录页面（需要登录）
  goToHistory() {
    this.requireUserAuth(() => {
      wx.navigateTo({
        url: '/pages/list/list?mode=history'
      });
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
    
    this.requireUserAuth(async () => {
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
    });
  },

  // === 公开朋友圈推荐功能 ===
  
  // 加载随机公开朋友圈推荐
  async loadRecommendations() {
    if (this.data.isLoadingRecommendations) {
      return;
    }

    // 检查登录状态，API需要认证
    if (!this.data.isLoggedIn) {
      console.log('⚠️ 用户未登录，跳过推荐加载');
      this.setData({ 
        recommendedCircles: [],
        recommendationsLoaded: true,
        isLoadingRecommendations: false
      });
      return;
    }

    this.setData({ isLoadingRecommendations: true });

    try {
      console.log('🎲 开始加载随机公开朋友圈推荐');
      
      // 调用随机API获取单个公开朋友圈
      const res = await api.circles.getRandomPublicCircle({
        excludeVisited: 'true'  // 排除已访问的朋友圈
      });

      if (res.success) {
        if (res.data.circle) {
          // 有可用的朋友圈，现在API直接返回latestPost数据
          const circle = this.formatCircleImages(res.data.circle);
          
          const formattedCircle = {
            ...circle,
            formattedTime: util.formatRelativeTime(circle.createdAt),
            memberCount: circle.members ? circle.members.length : 0,
            hasLatestPost: !!(circle.latestPost && circle.latestPost.content)
          };

          this.setData({
            recommendedCircles: [formattedCircle],
            recommendationsLoaded: true  // 标记已经加载过推荐内容
          });

          console.log('✅ 随机公开朋友圈加载完成:', {
            circleId: circle._id,
            circleName: circle.name,
            hasLatestPost: formattedCircle.hasLatestPost,
            latestPostContent: circle.latestPost ? circle.latestPost.content : '无内容'
          });
        } else {
          // 暂无可用的朋友圈（正常情况），但添加自动重试机制
          console.log('💭 暂无可用的公开朋友圈，将设置自动重试');
          this.setData({ 
            recommendedCircles: [],
            recommendationsLoaded: true  // 即使没有推荐也标记为已加载
          });
          
          // 在空状态下增加自动重试机制
          setTimeout(() => {
            // 只有在仍然是空状态且用户未离开页面时才自动重试
            if (this.data.recommendedCircles.length === 0 && !this.data.isLoadingRecommendations && this.data.isLoggedIn) {
              console.log('🔄 自动重试加载推荐（首次加载）');
              this.loadRecommendations();
            }
          }, 15000); // 15秒后自动重试（比手动刷新间隔更长）
        }
      } else {
        console.warn('⚠️ API调用失败:', res.message);
        this.setData({ 
          recommendedCircles: [],
          recommendationsLoaded: true  // API调用失败也标记为已加载
        });
      }
    } catch (error) {
      console.error('❌ 加载随机公开朋友圈失败:', error);
      this.setData({ 
        recommendedCircles: [],
        recommendationsLoaded: true  // 出现异常也标记为已加载
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

    // 检查登录状态，API需要认证
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    try {
      console.log('🔄 刷新随机推荐（重置历史）');
      
      // 调用随机API并重置访问历史
      this.setData({ isLoadingRecommendations: true });
      
      const res = await api.circles.getRandomPublicCircle({
        excludeVisited: 'true',
        resetHistory: 'true'  // 重置访问历史
      });

      if (res.success) {
        if (res.data.circle) {
          // 有新的朋友圈推荐，现在API直接返回latestPost数据
          const circle = this.formatCircleImages(res.data.circle);
          
          const formattedCircle = {
            ...circle,
            formattedTime: util.formatRelativeTime(circle.createdAt),
            memberCount: circle.members ? circle.members.length : 0,
            hasLatestPost: !!(circle.latestPost && circle.latestPost.content)
          };

          this.setData({
            recommendedCircles: [formattedCircle],
            recommendationsLoaded: true  // 手动刷新后也标记为已加载
          });

          util.showToast('推荐已刷新');
          console.log('✅ 刷新随机推荐成功:', {
            circleName: circle.name,
            hasLatestPost: formattedCircle.hasLatestPost,
            latestPostContent: circle.latestPost ? circle.latestPost.content : '无内容'
          });
        } else {
          // 暂无可推荐的朋友圈，增加重试机制
          this.setData({ 
            recommendedCircles: [],
            recommendationsLoaded: true  // 即使没有推荐也标记为已加载
          });
          
          // 在空状态下增加自动重试机制
          console.log('💭 暂无可推荐朋友圈，将在10秒后自动重试');
          setTimeout(() => {
            // 只有在仍然是空状态且用户未离开页面时才自动重试
            if (this.data.recommendedCircles.length === 0 && !this.data.isLoadingRecommendations) {
              console.log('🔄 自动重试加载推荐');
              this.loadRecommendations();
            }
          }, 10000); // 10秒后自动重试
          
          util.showToast('暂无可推荐的朋友圈');
        }
      } else {
        console.warn('⚠️ 刷新API调用失败:', res.message);
        this.setData({ 
          recommendedCircles: [],
          recommendationsLoaded: true  // API调用失败也标记为已加载
        });
        util.showToast('刷新失败');
      }
    } catch (error) {
      console.error('❌ 刷新随机推荐失败:', error);
      this.setData({ 
        recommendedCircles: [],
        recommendationsLoaded: true  // 出现异常也标记为已加载
      });
      util.showToast('刷新失败');
    } finally {
      this.setData({ isLoadingRecommendations: false });
    }
  },

  // 查看推荐的朋友圈
  viewRecommendedCircle(e) {
    const { circleId } = e.currentTarget.dataset;
    
    if (!circleId) {
      console.error('❌ 朋友圈ID缺失');
      return;
    }

    console.log('👀 查看推荐朋友圈:', circleId);
    
    // 跳转到朋友圈详情页
    wx.navigateTo({
      url: `/pages/details/details?circleId=${circleId}&source=recommendation`
    });
  },

});