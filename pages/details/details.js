// pages/details/details.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const api = require('../../utils/api');
const util = require('../../utils/util');
const navigationHelper = require('../../utils/navigationHelper');

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
    showCommentInput: false, // 是否显示评论输入框
    focusInput: false,    // 是否聚焦输入框
    
    // 邀请相关状态
    isInviteMode: false,  // 是否为邀请模式
    inviterId: '',        // 邀请人ID
    showJoinButton: false, // 是否显示加入按钮
    isJoining: false,     // 是否正在加入中
    isCircleOwner: false, // 当前用户是否为朋友圈主人
    
    // 申请加入相关状态
    isMember: false,      // 当前用户是否为朋友圈成员
    isInvited: false,     // 当前用户是否被邀请
    hasApplied: false,    // 当前用户是否已经申请过
    isApplying: false,    // 是否正在申请中
    showApplyButton: false, // 是否显示申请按钮
    showPublishButton: false, // 是否显示发布按钮
    
    // 数据缓存相关
    lastDataLoadTime: 0,  // 上次数据加载时间
    needsDataRefresh: true, // 是否需要刷新数据
    
    
    // 🔧 帖子数据（确保字段存在，用于同步设置）
    posts: [],            // 帖子列表
    loading: false,       // 加载状态
    hasMore: true,        // 是否还有更多数据
    
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44
    },
    safeAreaBottom: 160,  // 底部安全区域 + 发布按钮区域
    
    // 导航栏数据
    navigationData: {
      statusBarHeight: 44,
      navigationBarHeight: 44,
      totalNavigationHeight: 88,
      capsuleVerticalCenter: 22
    },
    
  },

  onLoad(options) {
    this.getSafeAreaInfo();
    this.setupStoreBindings();
    
    const { circleId, type, inviterId, preloaded, preloadFailed, source } = options;
    
    if (!circleId) {
      util.showToast('朋友圈ID不能为空');
      wx.navigateBack();
      return;
    }
    
    // 处理邀请模式
    if (type === 'invite' && inviterId) {
      this.setData({ 
        circleId,
        isInviteMode: true,
        inviterId: inviterId,
        showJoinButton: true
      });
      
      // 方案一：被邀请访客完全禁止分享
      wx.hideShareMenu();

    } else {
      // 正常模式
      this.setData({ 
        circleId,
        isInviteMode: false,
        showJoinButton: false
      });
    }
    
    // 检查是否有预加载数据
    if (preloaded === 'true') {
      this.loadWithPreloadedData(circleId);
    } else if (preloadFailed === 'true') {
      this.loadCircleDetail();
    } else {
      this.loadCircleDetail();
    }
  },

  onUnload() {
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
        loadPosts: 'loadPosts',
        refreshPosts: 'refreshPosts',
        loadMorePosts: 'loadMorePosts',
        toggleLike: 'toggleLike',
        addComment: 'addComment',
        deleteComment: 'deleteComment',
        deletePost: 'deletePost'
      }
    });
  },

  // 获取安全区域信息
  getSafeAreaInfo() {
    const app = getApp();
    if (app && app.globalData.safeAreaInfo) {
      // 计算底部安全区域
      const safeAreaInfo = navigationHelper.getSafeAreaInfo();
      const bottomSafeArea = safeAreaInfo.bottomSafeArea;
      
      // 计算实际需要的底部空间：发布按钮(120rpx) + 底部安全区域 + 额外边距
      const publishButtonHeight = 120; // rpx转px大约是60px
      const calculatedBottom = bottomSafeArea + publishButtonHeight + 20;
      
      this.setData({
        safeAreaInfo: app.globalData.safeAreaInfo,
        safeAreaBottom: calculatedBottom
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

  onShow() {
    // 智能刷新：基于场景和数据状态精确判断
    if (this.data.circleId) {
      this.intelligentRefreshData();
    }
  },
  
  // 🎯 方案二：智能刷新数据 - 基于场景和数据状态精确判断
  intelligentRefreshData() {
    const now = Date.now();
    const { lastDataLoadTime, needsDataRefresh } = this.data;
    
    // 分析刷新场景
    const refreshContext = this.analyzeRefreshContext();
    // 根据场景决定刷新策略
    if (refreshContext.shouldRefresh) {
      
      // 根据刷新类型执行相应的数据加载
      this.executeRefreshByType(refreshContext.refreshType);
      
      // 更新缓存标记
      this.setData({
        lastDataLoadTime: now,
        needsDataRefresh: false
      });
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
      
      // 从设置页面返回（已通过变更追踪处理，这里不应该触发）
      if (prevPage.route.includes('setting')) {
        return {
          shouldRefresh: false,
          skipReason: '从设置页面返回，已通过变更追踪处理'
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
    this.setData({
      needsDataRefresh: true
    });
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

  // 使用预加载数据加载朋友圈详情
  async loadWithPreloadedData(circleId) {
    try {
      const app = getApp();
      const preloadedData = app.globalData.preloadedCircleData;
      
      // 验证预加载数据的有效性
      if (!preloadedData || 
          preloadedData.circleId !== circleId ||
          !preloadedData.circleData ||
          (Date.now() - preloadedData.timestamp) > 10000) {
        this.loadCircleDetail();
        return;
      }

      const targetCircle = preloadedData.circleData;
      
      // 检查用户状态
      const userStatus = this.checkUserStatus(targetCircle);

      this.setData({
        circle: targetCircle,
        isCircleOwner: userStatus.isOwner,
        isMember: userStatus.isMember,
        isInvited: userStatus.isInvited,
        hasApplied: userStatus.hasApplied,
        showApplyButton: userStatus.showApplyButton,
        showJoinButton: userStatus.showJoinButton,
        showPublishButton: userStatus.showPublishButton
      });

      // 直接通过setData同步设置帖子数据，确保页面切换时立即有数据
      const { postStore } = require('../../store/postStore');
      
      if (postStore.currentCircleId === circleId && postStore.posts && postStore.posts.length >= 0) {
        this.setData({
          posts: postStore.posts,
          hasMore: postStore.hasMore,
          loading: false
        });
      }

      // 清理全局预加载数据
      app.globalData.preloadedCircleData = null;

    } catch (error) {
      // 回退到常规加载
      this.loadCircleDetail();
    }
  },

  // 加载朋友圈详情
  async loadCircleDetail() {
    try {
      let targetCircle = null;
      
      // 首先尝试从用户参与的朋友圈中查找
      try {
        const circlesRes = await api.circles.getMy();
        targetCircle = circlesRes.data.circles.find(c => c._id === this.data.circleId);
      } catch (error) {
        // 用户未登录或不是此朋友圈成员，尝试直接获取朋友圈详情
      }
      
      // 如果没有找到，尝试直接获取朋友圈详情（可能是公开朋友圈）
      if (!targetCircle) {
        const detailRes = await api.circles.getDetail(this.data.circleId);
        targetCircle = detailRes.data.circle;
      }
      
      if (!targetCircle) {
        throw new Error('朋友圈不存在或无权访问');
      }

      // 格式化数据
      targetCircle.formattedTime = util.formatRelativeTime(targetCircle.createdAt);
      targetCircle.memberCount = targetCircle.members ? targetCircle.members.length : 0;

      // 检查用户状态
      const userStatus = this.checkUserStatus(targetCircle);

      this.setData({
        circle: targetCircle,
        isCircleOwner: userStatus.isOwner,
        isMember: userStatus.isMember,
        isInvited: userStatus.isInvited,
        hasApplied: userStatus.hasApplied,
        showApplyButton: userStatus.showApplyButton,
        showJoinButton: userStatus.showJoinButton,
        showPublishButton: userStatus.showPublishButton
      });

      // 帖子查看权限：公开朋友圈所有人可看，私密朋友圈只有成员和被邀请者可看
      const canViewPosts = targetCircle.isPublic || // 公开朋友圈任何人都能看
                          userStatus.isMember ||   // 私密朋友圈的成员能看
                          userStatus.isInvited;   // 私密朋友圈的被邀请者能看
                          // 注意：私密朋友圈的申请者不能看（可能是之前公开时申请，后来改为私密）
      
      if (canViewPosts) {
        await this.loadPosts(this.data.circleId);
      }

    } catch (error) {
      util.showToast('加载失败');
      
      // 如果加载失败，返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 检查用户状态（使用后端完善的状态数据）
  checkUserStatus(circle) {
    const { currentUser, isInviteMode } = this.data;
    
    // 如果用户未登录
    if (!currentUser || !currentUser._id) {
      return {
        status: 'not_logged_in',
        isOwner: false,
        isMember: false,
        isInvited: false,
        hasApplied: false,
        showApplyButton: false,
        showJoinButton: false,
        showPublishButton: false
      };
    }

    const userId = currentUser._id;
    
    // 🔧 修复：首先检查用户是否是创建者
    const creatorId = typeof circle.creator === 'object' ? circle.creator._id : circle.creator;
    const isOwner = creatorId === userId;
    
    // 🔧 修复：检查用户的各种状态 - 创建者自动是成员
    const isMemberByArray = circle.members && circle.members.some(member => {
      const memberId = typeof member === 'object' ? member._id : member;
      return memberId === userId;
    });
    
    // 🔧 关键修复：创建者自动是成员，即使不在members数组中
    const isMember = isOwner || isMemberByArray;


    const isInvited = circle.invitees && circle.invitees.some(invitee => {
      const inviteeId = typeof invitee === 'object' ? invitee._id : invitee;
      return inviteeId === userId;
    });

    const hasApplied = circle.appliers && circle.appliers.some(applier => {
      const applierId = typeof applier === 'object' ? applier._id : applier;
      return applierId === userId;
    });

    // 状态优先级判断（解决冲突）
    if (isMember) {

      return {
        status: 'member',
        isOwner,
        isMember: true,
        isInvited: false,
        hasApplied: false,
        showApplyButton: false,
        showJoinButton: false,
        showPublishButton: true
      };
    }
    
    if (isInviteMode && isInvited) {

      return {
        status: 'invited',
        isOwner: false,
        isMember: false,
        isInvited: true,
        hasApplied: false,
        showApplyButton: false,
        showJoinButton: true,
        showPublishButton: false
      };
    }
    
    if (hasApplied) {

      return {
        status: 'applied',
        isOwner: false,
        isMember: false,
        isInvited: false,
        hasApplied: true,
        showApplyButton: false,
        showJoinButton: false,
        showPublishButton: false
      };
    }
    
    if (circle.isPublic && !isInviteMode) {

      return {
        status: 'can_apply',
        isOwner: false,
        isMember: false,
        isInvited: false,
        hasApplied: false,
        showApplyButton: true,
        showJoinButton: false,
        showPublishButton: false
      };
    }
    

    return {
      status: 'no_access',
      isOwner: false,
      isMember: false,
      isInvited: false,
      hasApplied: false,
      showApplyButton: false,
      showJoinButton: false,
      showPublishButton: false
    };
  },

  // 智能返回：有上一个页面就返回，没有就跳转到主页面
  navigateBack() {
    const pages = getCurrentPages();

    
    if (pages.length >= 2) {
      // 有上一个页面，直接返回

      wx.navigateBack();
    } else {
      // 没有上一个页面，重启到主页面

      wx.reLaunch({
        url: '/pages/main/main'
      });
    }
  },



  // 打开设置
  openSettings() {
    const { circleId } = this.data;
    if (!circleId) {
      wx.showToast({
        title: '朋友圈信息不完整',
        icon: 'none'
      });
      return;
    }
    
    // 标记准备进入设置页面

    
    // 导航到朋友圈设置页面，传递朋友圈ID
    wx.navigateTo({
      url: `/pages/setting/setting?circleId=${circleId}`,
      fail: (err) => {

        wx.showToast({
          title: '打开设置失败',
          icon: 'none'
        });
      }
    });
  },

  // 检查当前用户是否为朋友圈主人
  isCircleOwner() {
    const { currentUser, circle } = this.data;
    
    // 检查必要的数据是否存在
    if (!currentUser || !circle || !circle.creator) {
      return false;
    }
    
    // 根据 user._id 进行权限检查
    const isOwner = currentUser._id === circle.creator._id || currentUser._id === circle.creator;
    return isOwner;
  },





  // 微信分享处理
  onShareAppMessage() {
    const { circle, circleId, currentUser, isInviteMode } = this.data;
    
    // 方案一：被邀请访客完全无法分享
    if (isInviteMode) {
      wx.showToast({
        title: '请先加入朋友圈才能分享',
        icon: 'none'
      });
      return null;
    }
    
    // 检查数据完整性
    if (!circle || !circleId || !currentUser) {
      return {
        title: '朋友圈分享',
        path: '/pages/main/main'
      };
    }
    
    // 只有朋友圈主人可以发出邀请
    if (this.isCircleOwner()) {
      return {
        title: `邀请你加入"${circle.name}"朋友圈`,
        path: `/pages/details/details?circleId=${circleId}&type=invite&inviterId=${currentUser._id}`,
        imageUrl: circle.coverImage || '/images/default_avatar.png'
      };
    } else {
      // 普通成员的分享（暂时返回null，后续可考虑推荐分享）
      wx.showToast({
        title: '目前只有朋友圈主人可以邀请新成员',
        icon: 'none'
      });
      return null;
    }
  },

  // 接受邀请加入朋友圈
  async acceptInvite() {
    const { circleId, inviterId, currentUser, isJoining } = this.data;
    
    if (isJoining) return; // 防止重复点击
    
    if (!currentUser || !currentUser._id) {
      wx.showToast({
        title: '请先登录再加入朋友圈',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isJoining: true });
    
    try {
      wx.showLoading({ title: '正在加入...' });
      
      // 调用新的接受邀请API
      await api.circles.acceptInvite(circleId);
      
      wx.hideLoading();
      wx.showToast({
        title: '加入成功！',
        icon: 'success'
      });
      
      // 更新状态，切换到正常模式
      this.setData({
        isInviteMode: false,
        showJoinButton: false,
        isJoining: false
      });
      
      // 恢复分享功能
      wx.showShareMenu({
        withShareTicket: false,
        menus: ['shareAppMessage']
      });
      
      // 重新加载朋友圈详情，获取最新成员信息
      await this.loadCircleDetail();
      
    } catch (error) {
      wx.hideLoading();
      this.setData({ isJoining: false });
      
      console.error('加入朋友圈失败:', error);
      wx.showModal({
        title: '加入失败',
        content: error.message || '无法加入朋友圈，请稍后重试',
        showCancel: false
      });
    }
  },



  // 打开相机
  openCamera() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: (res) => {
        wx.showToast({
          title: '选择了' + res.tempFiles.length + '张图片',
          icon: 'success'
        });
        // 这里可以添加图片上传和发布逻辑
      },
              fail: (err) => {
          wx.showToast({
            title: '选择媒体失败',
            icon: 'none'
          });
        }
    });
  },

  // ===== 帖子组件事件处理 =====

  // 点赞/取消点赞
  async onPostLike(e) {
    const { postId } = e.detail;

    if (!this.data.isLoggedIn) {
      util.showToast('请先登录');
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

    if (!this.data.isLoggedIn) {
      util.showToast('请先登录');
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

    if (!this.data.isLoggedIn) {
      util.showToast('请先登录');
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



  // 导航到发布页面
  navigateToPublish() {
    if (!this.data.isLoggedIn) {
      util.showToast('请先登录');
      return;
    }

    wx.navigateTo({
      url: `/pages/publish/publish?circleId=${this.data.circleId}`
    });
  },



  // 回复评论
  replyComment(e) {
    const { userId, username, postId } = e.currentTarget.dataset;
    this.setData({
      showCommentInput: true,
      selectedPostId: postId,
      replyToUser: { id: userId, username },
      commentText: '',
      focusInput: true  // 恢复同时弹出评论框和键盘
    });
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
    const { commentText, replyToUser, selectedPostId } = this.data;

    if (util.isEmpty(commentText)) {
      util.showToast('请输入评论内容');
      return;
    }

    if (!selectedPostId) {
      util.showToast('未选择帖子');
      return;
    }

    try {
      const data = {
        content: commentText.trim(),
        replyToUserId: replyToUser ? replyToUser.id : undefined,
        replyToUsername: replyToUser ? replyToUser.username : undefined
      };

      await this.addComment(selectedPostId, data);

      util.showToast('评论成功');

      // 隐藏输入框并清空内容
      this.setData({
        showCommentInput: false,
        commentText: '',
        replyToUser: null,
        selectedPostId: '',
        focusInput: false
      });

    } catch (error) {
      util.showToast('评论失败');
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

  // 分享朋友圈
  onShareAppMessage() {
    const { circle } = this.data;
    if (!circle) return {};

    return {
      title: circle.name || '查看朋友圈',
      path: `/pages/details/details?circleId=${this.data.circleId}`,
      imageUrl: circle.coverImage || ''
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { circle } = this.data;
    if (!circle) return {};

    return {
      title: circle.name || '查看朋友圈',
      query: `circleId=${this.data.circleId}`,
      imageUrl: circle.coverImage || ''
    };
  },

  // === 申请加入功能 ===
  
  // 申请加入朋友圈
  async applyToJoin() {
    const { circleId, isApplying, currentUser } = this.data;
    
    // 防止重复点击
    if (isApplying) {
      return;
    }

    // 检查登录状态
    if (!currentUser || !currentUser._id) {
      wx.showModal({
        title: '需要登录',
        content: '申请加入朋友圈需要先登录，是否前往登录？',
        success: (res) => {
          if (res.confirm) {
            // 触发登录流程
            wx.navigateTo({
              url: '/pages/userInfo/userInfo'
            });
          }
        }
      });
      return;
    }

    this.setData({ isApplying: true });

    try {
  

      wx.showLoading({ title: '申请中...' });
      
      // 调用API申请加入
      const res = await api.circles.applyToJoin(circleId);
      
      wx.hideLoading();

      if (res.success) {
        wx.showToast({
          title: '申请已提交',
          icon: 'success'
        });

        // 更新状态
        this.setData({
          hasApplied: true,
          showApplyButton: false
        });


      } else {
        throw new Error(res.message || '申请失败');
      }

    } catch (error) {
      wx.hideLoading();

      
      wx.showModal({
        title: '申请失败',
        content: error.message || '申请加入朋友圈失败，请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ isApplying: false });
    }
  },

});