// pages/main/main.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  // 使用MobX状态管理行为
  behaviors: [storeBindingsBehavior],
  
  data: {
    circles: [],          // 朋友圈列表
    recentCircle: null,   // 最近的朋友圈（用于首页卡片显示）
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
    
    discoverItems: [      // 发现内容
      {
        id: 1,
        avatar: '/images/default_avatar.png',
        content: '现在上车了，很久没有这样火车旅行，期待你睡。',
        image: '/images/default_avatar.png'
      }
    ],
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44,
      navBarHeight: 88,
      safeAreaTop: 44
    }
  },

  onLoad(options) {
    console.log('🚀 主页面加载', options);
    
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
    const app = getApp();
    if (app && app.globalData.safeAreaInfo) {
      this.setData({
        safeAreaInfo: app.globalData.safeAreaInfo
      });
    }
  },

  onUnload() {
    console.log('🧹 主页面卸载，清理资源');
    
    // 清理MobX绑定，防止内存泄漏
    if (this.storeBindings) {
      try {
        this.storeBindings.destroyStoreBindings();
        this.storeBindings = null;
        console.log('✅ MobX绑定已清理');
      } catch (error) {
        console.warn('⚠️ 清理MobX绑定失败:', error);
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
        avatarUrl: 'avatarUrl'             // 用户头像URL
      },
      actions: {
        // 绑定actions到页面方法
        performUserRegistration: 'performUserRegistration',
        logout: 'logout'
      }
    });
  },

  onShow() {
    console.log('👁️ 主页面显示');
    
    // 检查是否从userInfo页面返回，如果是则刷新用户状态
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const prevPage = pages[pages.length - 2];
    
    console.log('📄 当前页面栈:', pages.map(p => p.route));
    
    if (prevPage && prevPage.route === 'pages/userInfo/userInfo') {
      console.log('🔄 从用户信息页面返回，刷新用户状态');
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
    
    console.log('🔍 用户状态检查 - 全局状态:', globalLoginStatus, 'Store状态:', userStore.loginStatus, '本地状态:', this.data.isLoggedIn);
    
    // 如果全局状态和store状态不一致，同步一下
    if (globalLoginStatus === 'loggedIn' && globalUserInfo && 
        (userStore.loginStatus !== 'loggedIn' || !userStore.userInfo)) {
      console.log('🔄 检测到状态不同步，正在同步用户状态');
      const { USER_STATUS } = require('../../store/userStore');
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: globalUserInfo });
    }
    
    // 根据登录状态加载数据 - 检查多个状态源确保准确性
    const shouldLoadData = this.data.isLoggedIn || 
                          globalLoginStatus === 'loggedIn' || 
                          userStore.isLoggedIn;
                          
    console.log('🎯 登录状态检查结果 - 本地:', this.data.isLoggedIn, '全局:', globalLoginStatus === 'loggedIn', 'Store:', userStore.isLoggedIn, '最终结果:', shouldLoadData);
    
    if (shouldLoadData) {
      console.log('✅ 用户已登录，开始加载朋友圈数据');
      // 使用节流机制加载朋友圈列表，避免频繁请求
      this.loadCirclesWithThrottle();
    } else {
      console.log('❌ 用户未登录，跳过数据加载');
    }
  },

  // 用户登录/注册处理
  async handleUserAuth() {
    console.log('🎯 用户触发认证流程');
    
    // 根据当前状态执行不同的操作
    if (this.data.loginStatus === 'unregistered' && !this.data.isLoading) {
      // 未注册状态，触发注册
      await this.performUserRegistration();
      
      // 注册成功后加载数据
      if (this.data.isLoggedIn) {
        this.loadCirclesWithThrottle(true); // 强制刷新
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
        console.log('创建朋友圈响应:', result);
        
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
        console.error('创建朋友圈失败:', error);
        wx.showToast({ title: '创建失败', icon: 'error' });
      }
    });
  },

  // 进入最近的朋友圈详情页面
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

  // 下拉刷新
  onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      this.setData({ refreshing: true });
      this.loadCirclesWithThrottle(true); // 强制刷新
      // 设置延时停止刷新，因为loadCirclesWithThrottle没有返回Promise
      setTimeout(() => {
        wx.stopPullDownRefresh();
        this.setData({ refreshing: false });
      }, 1000);
    } else {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '请先登录', icon: 'none' });
    }
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading && this.data.currentCircleId && this.data.isLoggedIn) {
      this.loadPosts(this.data.currentCircleId, true);
    }
  },

  // 带节流的加载朋友圈列表
  loadCirclesWithThrottle(forceRefresh = false) {
    const now = Date.now();
    const timeSinceLastLoad = now - this.data.lastCirclesLoadTime;
    
    // 如果正在加载中，跳过（除非强制刷新）
    if (this.data.isLoadingCircles && !forceRefresh) {
      console.log('⏱️ 朋友圈正在加载中，跳过重复请求');
      return;
    }
    
    // 如果距离上次加载时间小于节流时间，且不是强制刷新，跳过
    if (timeSinceLastLoad < this.data.circlesLoadThrottle && !forceRefresh) {
      console.log(`⏱️ 距离上次加载仅${timeSinceLastLoad}ms，跳过请求（节流时间：${this.data.circlesLoadThrottle}ms）`);
      return;
    }
    
    if (forceRefresh) {
      console.log('🚀 执行朋友圈强制刷新');
    } else {
      console.log('🚀 执行朋友圈加载（节流检查通过）');
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
    
    console.log('🔄 开始加载朋友圈列表 - 本地状态:', this.data.isLoggedIn, '全局状态:', globalLoginStatus, 'Store状态:', userStore.isLoggedIn, '最终状态:', isLoggedIn);
    
    if (!isLoggedIn) {
      console.log('❌ 用户未登录，跳过加载朋友圈');
      return;
    }

    // 设置加载状态
    this.setData({
      isLoadingCircles: true,
      lastCirclesLoadTime: Date.now()
    });

    try {
      console.log('📡 调用API获取朋友圈列表...');
      const res = await api.circles.getMyParticipated();
      const circles = res.data.circles || [];
      
      console.log('✅ 朋友圈列表获取成功，数量:', circles.length);
      console.log('📋 朋友圈列表:', circles.map(c => ({ id: c._id, name: c.name })));
      
      // 设置最近的朋友圈（第一个，因为后端按时间倒序）
      const recentCircle = circles.length > 0 ? circles[0] : null;
      if (recentCircle) {
        // 格式化最近朋友圈的时间
        recentCircle.formattedTime = util.formatRelativeTime(recentCircle.createdAt);
        recentCircle.memberCount = recentCircle.members ? recentCircle.members.length : 0;
        console.log('📌 设置最近朋友圈:', recentCircle.name);
      } else {
        console.log('❌ 没有找到朋友圈');
      }
      
      this.setData({ 
        circles,
        recentCircle,
        isLoadingCircles: false
      });
      
      console.log('✅ 数据更新完成，circles长度:', this.data.circles.length, '最近朋友圈:', this.data.recentCircle?.name);
      
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
        // 使用MobX store中的用户信息
        post.isLiked = post.likes && post.likes.includes(this.data.userInfo?.openid);
        
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
        
        // 更新本地数据
        const posts = [...this.data.posts];
        posts[index].isLiked = liked;
        
        if (liked) {
          posts[index].likes = posts[index].likes || [];
          posts[index].likes.push(this.data.userInfo?.openid);
        } else {
          posts[index].likes = posts[index].likes.filter(id => id !== this.data.userInfo?.openid);
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
  }
});