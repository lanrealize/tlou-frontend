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
    
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44
    },
    
    // 导航栏数据
    navigationData: {
      statusBarHeight: 44,
      navigationBarHeight: 44,
      totalNavigationHeight: 88,
      capsuleVerticalCenter: 22
    }
  },

  onLoad(options) {
    this.getSafeAreaInfo();
    this.getNavigationData();
    this.setupStoreBindings();
    
    const { circleId, type, inviterId } = options;
    
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
      
      console.log('🔗 邀请模式进入，邀请人ID:', inviterId);
    } else {
      // 正常模式
      this.setData({ 
        circleId,
        isInviteMode: false,
        showJoinButton: false
      });
    }
    
    this.loadCircleDetail();
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
      this.setData({
        safeAreaInfo: app.globalData.safeAreaInfo
      });
    }
  },

  // 获取导航栏数据
  getNavigationData() {
    const navigationData = navigationHelper.getNavigationInfo();
    const app = getApp();
    const statusBarHeight = app.globalData.safeAreaInfo.statusBarHeight;
    
    // 计算垂直居中位置
    const capsuleCenter = navigationData.menuTop + navigationData.menuHeight / 2;
    const verticalCenter = capsuleCenter - statusBarHeight;
    
    this.setData({ 
      navigationData: {
        ...navigationData,
        statusBarHeight,
        navigationBarHeight: 44,
        totalNavigationHeight: statusBarHeight + 44,
        capsuleVerticalCenter: verticalCenter
      }
    });
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.circleId) {
      this.loadCircleDetail();
      this.refreshPosts(this.data.circleId);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    Promise.all([
      this.loadCircleDetail(),
      this.refreshPosts(this.data.circleId)
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadMorePosts();
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
        console.log('用户未登录或不是此朋友圈成员，尝试直接获取朋友圈详情');
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
      console.error('加载朋友圈详情失败:', error);
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
    
    // 检查用户的各种状态
    const isMember = circle.members && circle.members.some(member => {
      const memberId = typeof member === 'object' ? member._id : member;
      return memberId === userId;
    });

    const creatorId = typeof circle.creator === 'object' ? circle.creator._id : circle.creator;
    const isOwner = creatorId === userId;

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
      console.log('👤 用户状态: 成员');
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
      console.log('💌 用户状态: 被邀请');
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
      console.log('📝 用户状态: 已申请');
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
      console.log('🌍 用户状态: 可申请');
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
    
    console.log('🚫 用户状态: 无访问权限');
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
    console.log('🔄 智能返回 - 当前页面栈:', pages.map(p => p.route));
    
    if (pages.length >= 2) {
      // 有上一个页面，直接返回
      console.log('✅ 检测到上一个页面，使用navigateBack');
      wx.navigateBack();
    } else {
      // 没有上一个页面，重启到主页面
      console.log('❌ 没有上一个页面，使用reLaunch跳转到主页面');
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
    
    // 导航到朋友圈设置页面，传递朋友圈ID
    wx.navigateTo({
      url: `/pages/setting/setting?circleId=${circleId}`,
      fail: (err) => {
        console.error('导航到设置页面失败:', err);
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
        console.error('选择媒体失败:', err);
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
      console.error('点赞操作失败:', error);
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

    this.setData({
      showCommentInput: true,
      selectedPostId: postId,
      replyToUser: null,
      commentText: ''
    });

    // 延迟一小段时间确保DOM更新后再聚焦
    setTimeout(() => {
      this.setData({
        focusInput: true
      });
    }, 100);
  },

  // 回复评论
  onPostReplyComment(e) {
    const { postId, replyToUser } = e.detail;

    if (!this.data.isLoggedIn) {
      util.showToast('请先登录');
      return;
    }

    this.setData({
      showCommentInput: true,
      selectedPostId: postId,
      replyToUser,
      commentText: ''
    });

    // 延迟一小段时间确保DOM更新后再聚焦
    setTimeout(() => {
      this.setData({
        focusInput: true
      });
    }, 100);
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

  // 长按帖子
  onPostLongPress(e) {
    const { postId, post } = e.detail;

    // 检查是否是帖子作者
    const isAuthor = this.data.userInfo?._id === post.author._id;
    const actions = [];

    if (isAuthor) {
      actions.push('删除动态');
    }
    actions.push('举报', '取消');

    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const action = actions[res.tapIndex];
        switch (action) {
          case '删除动态':
            this.onPostDelete({ detail: { postId, post } });
            break;
          case '举报':
            util.showToast('举报功能开发中');
            break;
        }
      }
    });
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
      commentText: ''
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
      console.error('发表评论失败:', error);
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
      console.log('📝 开始申请加入朋友圈:', circleId);

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

        console.log('✅ 申请提交成功');
      } else {
        throw new Error(res.message || '申请失败');
      }

    } catch (error) {
      wx.hideLoading();
      console.error('❌ 申请加入失败:', error);
      
      wx.showModal({
        title: '申请失败',
        content: error.message || '申请加入朋友圈失败，请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ isApplying: false });
    }
  }
});