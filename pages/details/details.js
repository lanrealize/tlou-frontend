// pages/details/details.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { when } = require('mobx-miniprogram');
const api = require('../../utils/api');
const util = require('../../utils/util');
const navigationHelper = require('../../utils/navigationHelper');
const { getUserStatusWithRole, checkAndHandle, canShareCircle } = require('../../utils/checkUserActionPermission');
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
    showCommentInput: false, // 是否显示评论输入框
    focusInput: false,    // 是否聚焦输入框
    pendingApplicationsCount: 0, // 待处理申请数量
    
    // 🆕 邀请码访问
    inviteCode: '',       // 邀请码（从URL参数获取）
    
    // 用户状态
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
    
    // 统一状态（传递给circle-status-action组件）
    userStatus: 'not_logged_in', // not_logged_in | member | invited | applied | can_apply | no_access
    
    // 数据缓存相关
    lastDataLoadTime: 0,  // 上次数据加载时间
    needsDataRefresh: true, // 是否需要刷新数据
    
    // 🔧 帖子数据（确保字段存在，用于同步设置）
    posts: [],            // 帖子列表
    loading: false,       // 加载状态
    hasMore: true,        // 是否还有更多数据
    
    // 朋友圈不存在状态
    circleNotFound: false, // 朋友圈是否不存在
    
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
    
    // 用户信息弹出层
    userInfoPopupVisible: false,
    userInfoPopupReason: '',
    userInfoPopupIntent: '',
    userInfoPopupCircleId: '',
    
    // 🎬 分享入场动画 - 完整三步
    isFromShare: false,           // 是否从分享打开
    shareAnimationState: 'idle',  // 动画状态机：idle | ready | playing | transitioning | completed
    showShareAnimation: false,    // 是否显示动画容器
    shareAnimationClass: '',      // 动画容器类名
    shareGradientClass: '',       // 渐变遮罩类名
    shareAnimationImageUrl: '',   // 动画图片URL
    shareAnimationCompleted: false, // 动画是否完成
    shareAnimationEnabled: true,  // 🧪 动画开关（测试用，生产环境设为 true）
    shareAnimationTransform: '',  // 动画过渡的 CSS 变量
    transitionActive: false       // 是否激活过渡动画
  },

  onLoad(options) {
    this.getSafeAreaInfo();
    this.setupStoreBindings();
    
    const { circleId, inviteCode, preloaded, preloadFailed, source, showCreateSuccess, shared } = options;
    
    if (!circleId) {
      util.showToast('朋友圈ID不能为空');
      wx.navigateBack();
      return;
    }
    
    const isFromShare = shared === 'true';
    const shouldShowAnimation = isFromShare && this.data.shareAnimationEnabled;
    
    console.log('📱 onLoad:', { isFromShare, shouldShowAnimation });
    
    // 🎬 创建动画控制器
    this.shareAnimationController = new ShareAnimationController(this);
    
    // 🎬 如果从分享打开，设置状态为 ready 并立即显示黑色背景
    this.setData({ 
      circleId,
      inviteCode: inviteCode || '',
      isFromShare,
      shareAnimationState: shouldShowAnimation ? 'ready' : 'idle',
      showShareAnimation: shouldShowAnimation,  // 立即显示黑色背景
      shareAnimationClass: '',
      shareGradientClass: '',
      shareAnimationImageUrl: '',
      shareAnimationCompleted: false
    });
    
    if (shouldShowAnimation) {
      console.log('🎬 已设置为 ready 状态，等待 posts 数据触发动画');
      console.log('📊 初始状态:', {
        showShareAnimation: this.data.showShareAnimation,
        shareAnimationCompleted: this.data.shareAnimationCompleted
      });
      console.log('🎨 CSS 类应该是: content-fade-in (opacity: 0)');
    }
    
    // 如果是创建成功后跳转过来，显示成功提示
    if (showCreateSuccess === 'true') {
      setTimeout(() => {
        wx.showToast({ title: '创建成功', icon: 'success', duration: 1000 });
      }, 1000);
    }
    
    // 加载朋友圈数据
    if (preloaded === 'true') {
      this.loadWithPreloadedData(circleId);
    } else {
      this.loadCircleDetail();
    }
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
  
  // 🆕 包装方法：自动传递 inviteCode
  async loadPosts(circleId, loadMore = false, extraParams = {}) {
    const params = this.data.inviteCode ? { inviteCode: this.data.inviteCode, ...extraParams } : extraParams;
    return this.loadPostsRaw(circleId, loadMore, params);
  },
  
  async refreshPosts(circleId) {
    const params = this.data.inviteCode ? { inviteCode: this.data.inviteCode } : {};
    return this.refreshPostsRaw(circleId, params);
  },
  
  async loadMorePosts() {
    const params = this.data.inviteCode ? { inviteCode: this.data.inviteCode } : {};
    return this.loadMorePostsRaw(params);
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
    // 确保 navigationData 存在且包含必要字段
    if (navigationData && navigationData.totalNavigationHeight) {
      this.setData({
        navigationData: navigationData
      });
    } else {
      // 如果事件数据有问题，使用当前 data 中的默认值
      console.warn('导航栏数据不完整，使用默认值');
    }
  },

  onShow() {
    console.log('📱 details 页面 onShow 被触发');
    
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
    
    // 智能刷新：基于场景和数据状态精确判断
    if (this.data.circleId) {
      this.intelligentRefreshData();
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
      
      // 🔑 使用全局状态管理判断用户关系
      const { currentUser } = this.data;
      const userId = currentUser?._id || null;
      const relation = getUserStatusWithRole(targetCircle, userId, this.data.inviteCode);

      this.setData({
        circle: targetCircle,
        isCircleOwner: relation.isOwner || false,
        isMember: relation.status === 'member',
        isInvited: relation.status === 'invited',
        hasApplied: relation.status === 'applied',
        showApplyButton: relation.status === 'can_apply',
        showJoinButton: relation.status === 'invited',
        showPublishButton: relation.status === 'member',
        userStatus: relation.status // 设置统一状态
      });

      // 🔑 根据权限设置分享菜单
      this.setupShareMenu(targetCircle, currentUser);

      // 直接通过setData同步设置帖子数据，确保页面切换时立即有数据
      const { postStore } = require('../../store/postStore');
      
      if (postStore.currentCircleId === circleId && postStore.posts && postStore.posts.length >= 0) {
        this.setData({
          posts: postStore.posts,
          hasMore: postStore.hasMore,
          loading: false
        });
        // 🎬 直接检查动画（无需延迟，从 postStore 读取）
        this.checkAndTriggerShareAnimation();
      }

      // 清理全局预加载数据
      app.globalData.preloadedCircleData = null;

      // 如果是朋友圈主人，加载待处理申请数量
      if (relation.isOwner) {
        await this.loadPendingApplicationsCount();
      }

    } catch (error) {
      // 回退到常规加载
      this.loadCircleDetail();
    }
  },

  // 加载朋友圈详情
  async loadCircleDetail() {
    try {
      let targetCircle = null;
      const { currentUser } = this.data;
      const isLoggedIn = currentUser && currentUser._id;
      
      // ✅ 优雅方案：API 层会自动判断调用认证API还是公开API
      
      // 已登录用户：先从我的朋友圈中查找（判断是否是成员）
      if (isLoggedIn) {
        try {
          const circlesRes = await api.circles.getMy();
          targetCircle = circlesRes.data.circles.find(c => c._id === this.data.circleId);
        } catch (error) {
          console.log('📝 从我的朋友圈中未找到，尝试获取详情');
        }
      }
      
      // 如果没找到（或未登录），获取朋友圈详情
      // API 层会自动判断：已登录 → /circles/:id，未登录 → /public/circles/:id
      if (!targetCircle) {
        try {
          // 🆕 传递 inviteCode 参数（如果有）
          const params = this.data.inviteCode ? { inviteCode: this.data.inviteCode } : {};
          const detailRes = await api.circles.getDetail(this.data.circleId, params);
          targetCircle = detailRes.data.circle;
        } catch (error) {
          this.handleCircleLoadError(error);
          return;
        }
      }
      
      if (!targetCircle) {
        throw new Error('朋友圈不存在或无权访问');
      }

      // 格式化数据
      targetCircle.formattedTime = util.formatRelativeTime(targetCircle.createdAt);
      targetCircle.memberCount = targetCircle.members ? targetCircle.members.length : 0;

      // 🔑 使用全局状态管理判断用户关系
      const userId = currentUser?._id || null;
      const relation = getUserStatusWithRole(targetCircle, userId, this.data.inviteCode);

      this.setData({
        circle: targetCircle,
        isCircleOwner: relation.isOwner || false,
        isMember: relation.status === 'member',
        isInvited: relation.status === 'invited',
        hasApplied: relation.status === 'applied',
        showApplyButton: relation.status === 'can_apply',
        showJoinButton: relation.status === 'invited',
        showPublishButton: relation.status === 'member',
        userStatus: relation.status // 设置统一状态
      });

      // 🔑 根据权限设置分享菜单
      this.setupShareMenu(targetCircle, currentUser);

      // 帖子查看权限：公开朋友圈所有人可看，私密朋友圈只有成员和被邀请者可看
      const canViewPosts = targetCircle.isPublic || // 公开朋友圈任何人都能看
                          relation.status === 'member' ||   // 私密朋友圈的成员能看
                          relation.status === 'invited';   // 私密朋友圈的被邀请者能看
                          // 注意：私密朋友圈的申请者不能看（可能是之前公开时申请，后来改为私密）
      
      if (canViewPosts) {
        // 包装方法会自动处理 inviteCode
        await this.loadPosts(this.data.circleId, false);
        // 🎬 直接检查动画（无需延迟，从 postStore 读取）
        this.checkAndTriggerShareAnimation();
      }

      // 如果是朋友圈主人，加载待处理申请数量
      if (relation.isOwner) {
        await this.loadPendingApplicationsCount();
      }

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
    wx.reLaunch({
      url: '/pages/main/main'
    });
  },



  // 加载待处理申请数量
  async loadPendingApplicationsCount() {
    try {
      const res = await api.circles.getAppliers(this.data.circleId);
      if (res.success) {
        const appliers = res.data.appliers || [];
        this.setData({
          pendingApplicationsCount: appliers.length
        });
      }
    } catch (error) {
      console.error('加载待处理申请数量失败:', error);
      // 静默失败，不影响主要功能
      this.setData({
        pendingApplicationsCount: 0
      });
    }
  },

  // 打开设置
  openSettings() {
    const { circleId, circle } = this.data;
    
    if (!circleId) {
      wx.showToast({
        title: '朋友圈信息不完整',
        icon: 'none'
      });
      return;
    }
    
    // 使用统一的权限检查：只有朋友圈成员才能进入设置页面
    if (!checkAndHandle('enterSettingsPage', { circle, inviteCode: this.data.inviteCode })) {
      return; // checkAndHandle 会自动处理未登录（弹窗）或非成员（Toast）
    }
    
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

  // 设置分享菜单的显示/隐藏
  setupShareMenu(circle, currentUser) {
    const canShare = canShareCircle(circle, currentUser, this.data.inviteCode);
    
    if (canShare) {
      // 可以分享：显示分享菜单
      wx.showShareMenu({
        withShareTicket: false,
        menus: ['shareAppMessage']
      });
      console.log('✅ 分享菜单已显示');
    } else {
      // 不能分享：隐藏分享菜单（彻底阻止分享）
      wx.hideShareMenu();
      console.log('🔒 分享菜单已隐藏');
    }
  },

  // 微信分享处理
  async onShareAppMessage() {
    const { circle, circleId, currentUser } = this.data;
    
    // 🔑 使用统一的权限管理检查分享权限
    const canShare = canShareCircle(circle, currentUser, this.data.inviteCode);
    
    if (!canShare) {
      console.warn('⚠️ 无权限分享，这不应该发生（分享菜单应该已隐藏）');
      return null;
    }
    
    // 🆕 所有分享都获取邀请码（不论公开/私有）
    // 原因：防止朋友圈从公开改为私有后，之前的分享链接失效
    let inviteCodeParam = '';
    try {
      const res = await api.circles.getInviteCode(circleId);
      const inviteCode = res.data.inviteCode;
      if (inviteCode) {
        inviteCodeParam = `&inviteCode=${inviteCode}`;
      }
    } catch (error) {
      console.error('获取邀请码失败:', error);
      wx.showToast({ title: '分享失败，请稍后重试', icon: 'none' });
      return null;
    }
    
    return {
      title: `邀请你加入"${circle.name}"朋友圈`,
      path: `/pages/details/details?circleId=${circleId}${inviteCodeParam}&shared=true`, // 🎬 添加分享标记
    };
  },

  // 接受邀请加入朋友圈
  async acceptInvite() {
    const { circleId, circle, isJoining } = this.data;
    
    // 访问控制：检查是否登录
    if (!checkAndHandle('acceptInvite', { circle, inviteCode: this.data.inviteCode, circleId })) {
      return; // checkAndHandle 会自动处理跳转和意图保存
    }
    
    if (isJoining) return;
    
    this.setData({ isJoining: true });
    
    try {
      wx.showLoading({ title: '正在加入...' });
      await api.circles.acceptInvite(circleId);
      
      wx.hideLoading();
      wx.showToast({ title: '加入成功！', icon: 'success' });
      
      // 重置加入状态
      this.setData({ isJoining: false });
      
      // 重新加载朋友圈详情，setupShareMenu 会根据用户权限自动设置分享菜单
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

    // 使用统一的权限检查：登录 + 成员资格
    const { circle, inviteCode } = this.data;
    if (!checkAndHandle('likePost', { circle, inviteCode })) {
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

    // 使用统一的权限检查：登录 + 成员资格
    const { circle, inviteCode } = this.data;
    if (!checkAndHandle('commentPost', { circle, inviteCode })) {
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

    // 使用统一的权限检查：登录 + 成员资格
    const { circle, inviteCode } = this.data;
    if (!checkAndHandle('commentPost', { circle, inviteCode })) {
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
    // 使用统一的权限检查：登录 + 成员资格
    const { circle, inviteCode } = this.data;
    if (!checkAndHandle('publishPost', { circle, inviteCode })) {
      return;
    }

    wx.navigateTo({
      url: `/pages/publish/publish?circleId=${this.data.circleId}`
    });
  },



  // 回复评论
  replyComment(e) {
    // 使用统一的权限检查：登录 + 成员资格
    const { circle, inviteCode } = this.data;
    if (!checkAndHandle('commentPost', { circle, inviteCode })) {
      return;
    }

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
      // ✅ 后端参数名：replyToUserOpenid
      const data = {
        content: commentText.trim(),
        replyToUserOpenid: replyToUser ? replyToUser.id : undefined,
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

  // 分享到朋友圈（分享到微信朋友圈，不是分享给朋友）
  onShareTimeline() {
    const { circle } = this.data;
    if (!circle) return {};

    return {
      title: circle.name || '查看朋友圈',
      query: `circleId=${this.data.circleId}`,
      imageUrl: circle.coverImage || '/assets/pics/newShare.png'
    };
  },

  // === 申请加入功能 ===
  
  // 去登录（由组件触发）
  goToLogin() {
    const app = getApp();
    app.showUserInfoPopup({
      reason: '请完善您的个人信息'
    });
  },

  // 统一的朋友圈加载错误处理
  handleCircleLoadError(error) {
    console.error('加载朋友圈失败:', error);
    
    // 401/403: 权限问题，引导登录
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再查看朋友圈详情',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            const app = getApp();
            app.showUserInfoPopup({
              reason: '登录后可以查看朋友圈详情'
            });
          } else {
            wx.navigateBack();
          }
        }
      });
    } else {
      // 其他错误：显示全屏overlay
      this.setData({ circleNotFound: true });
    }
  },

  // 申请加入朋友圈
  async applyToJoin() {
    const { circleId, circle, isApplying, currentUser, inviteCode } = this.data;
    
    // 访问控制：检查是否登录
    if (!checkAndHandle('applyToJoin', { circle, inviteCode, circleId })) {
      return; // checkAndHandle 会自动处理跳转和意图保存
    }
    
    if (isApplying) return;

    this.setData({ isApplying: true });

    try {
      wx.showLoading({ title: '申请中...' });
      const res = await api.circles.applyToJoin(circleId);
      
      wx.hideLoading();

      if (res.success) {
        wx.showToast({ title: '申请已提交', icon: 'success' });
        
        // 更新本地状态（后端已返回 currentUserStatus，重新加载即可获取最新状态）
        const updatedCircle = { ...circle };
        if (!updatedCircle.currentUserStatus) {
          updatedCircle.currentUserStatus = {
            isMember: false,
            isOwner: false,
            hasApplied: true
          };
        } else {
          updatedCircle.currentUserStatus.hasApplied = true;
        }
        
        this.setData({ 
          userStatus: 'applied', 
          isApplying: false,
          circle: updatedCircle,
          hasApplied: true
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
      this.setData({ isApplying: false });
    }
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
      if (intentType === 'acceptInvite' || intentType === 'invited') {
        // 接受邀请
        await this.acceptInvite();
      } else if (intentType === 'applyToJoin' || intentType === 'can_apply') {
        // 申请加入
        await this.applyToJoin();
      }
    } catch (error) {
      console.error('处理意图失败:', error);
      util.showToast(error.message || '操作失败', 'error');
    }
  },

  // ===== 🎬 分享入场动画控制方法 =====

  /**
   * 全屏动画图片加载完成
   * @param {Object} e - 事件对象，包含图片尺寸信息
   */
  onShareAnimationImageLoad(e) {
    const { width, height } = e.detail;
    console.log('📷 ========== 全屏动画图片加载完成 ==========');
    console.log('📐 图片尺寸:', { width, height });
    console.log('📐 图片宽高比:', (width / height).toFixed(2));
    
    // 🔍 关键：这个尺寸是什么？
    console.log('🤔 这是图片的【显示尺寸】还是【原始尺寸】？');
    console.log('   - 如果是显示尺寸（屏幕大小），我们需要从别处获取原始尺寸');
    console.log('   - 如果是原始尺寸（如3000x4000），可以直接使用');
    
    // 将尺寸传递给动画控制器进行计算
    if (this.shareAnimationController) {
      this.shareAnimationController.setImageSize(width, height);
      console.log('✅ 尺寸已传递给动画控制器');
    } else {
      console.error('❌ 动画控制器不存在');
    }
  },

  /**
   * 🚫 阻止滑动操作（动画期间）
   */
  preventTouchMove(e) {
    console.log('🚫 [交互阻止] 用户尝试滑动，已阻止');
    return false;  // 阻止事件继续传播
  },

  /**
   * 🚫 阻止点击操作（动画期间）
   */
  preventTap(e) {
    console.log('🚫 [交互阻止] 用户尝试点击，已阻止');
    return false;  // 阻止事件继续传播
  },

  /**
   * 检查并触发分享动画（使用 MobX Observable 模式 + ShareAnimationController）
   * 🎯 使用 MobX when() 监听 postStore 数据变化，优雅地等待数据就绪
   */
  async checkAndTriggerShareAnimation() {
    console.log('🎬 [checkAndTriggerShareAnimation] 被调用');
    
    const { shareAnimationState, isFromShare, shareAnimationEnabled } = this.data;
    
    console.log('🔍 当前状态:', { 
      shareAnimationState,
      isFromShare,
      shareAnimationEnabled
    });
    
    // 只在 ready 状态且满足条件时触发
    if (shareAnimationState !== 'ready') {
      console.log('⏭️ 跳过：状态不是 ready，当前状态:', shareAnimationState);
      return;
    }
    
    if (!isFromShare) {
      console.log('⏭️ 跳过：不是从分享打开');
      return;
    }
    
    if (!shareAnimationEnabled) {
      console.log('⏭️ 跳过：动画开关未开启');
      return;
    }
    
    // 🎯 使用 MobX when() Observable 模式等待数据就绪
    const { postStore } = require('../../store/postStore');
    const startTime = Date.now();
    
    console.log('👀 使用 Observable 模式监听 postStore 数据变化...');
    
    try {
      // when() 会在条件满足时立即执行，或超时后拒绝
      await when(
        // 条件：posts 有数据
        () => {
          const hasData = postStore.posts && postStore.posts.length > 0;
          if (!hasData) {
            console.log('👀 Observable 检查：数据尚未就绪...');
          }
          return hasData;
        },
        {
          timeout: SHARE_ANIMATION_CONFIG.dataWait.TIMEOUT,
          onError: (error) => {
            console.error('❌ Observable 等待出错:', error);
          }
        }
      );
      
      const waitTime = Date.now() - startTime;
      console.log(`✅ Observable 成功！数据就绪，等待耗时: ${waitTime}ms`);
      
      const posts = postStore.posts;
      
      // 检查第一个帖子是否有图片
      const firstPost = posts[0];
      console.log('🔍 第一个帖子:', firstPost);
      
      if (!firstPost || !firstPost.images || firstPost.images.length === 0) {
        console.log('❌ 第一个帖子没有图片，取消动画');
        this.shareAnimationController?.cancel();
        return;
      }
      
      // 获取第一张图片URL
      const firstImage = firstPost.images[0];
      const imageUrl = typeof firstImage === 'object' ? firstImage.url : firstImage;
      
      console.log('✅ 满足条件，使用 ShareAnimationController 启动动画');
      console.log('📷 图片URL:', imageUrl);
      
      // 🎬 使用动画控制器启动动画
      this.shareAnimationController?.start(imageUrl);
      
    } catch (error) {
      // 超时或其他错误
      const waitTime = Date.now() - startTime;
      console.warn(`⚠️ Observable 等待超时或失败（${waitTime}ms）:`, error);
      console.warn('取消动画');
      this.shareAnimationController?.cancel();
    }
  }

});