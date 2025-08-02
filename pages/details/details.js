// pages/details/details.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const api = require('../../utils/api');
const util = require('../../utils/util');

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
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44
    }
  },

  onLoad(options) {
    this.getSafeAreaInfo();
    this.setupStoreBindings();
    
    const { circleId } = options;
    
    if (circleId) {
      this.setData({ circleId });
      this.loadCircleDetail();
    } else {
      util.showToast('朋友圈ID不能为空');
      wx.navigateBack();
      return;
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
      this.setData({
        safeAreaInfo: app.globalData.safeAreaInfo
      });
    }
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
      // 获取朋友圈信息
      const circlesRes = await api.circles.getMy();
      const targetCircle = circlesRes.data.circles.find(c => c._id === this.data.circleId);
      
      if (!targetCircle) {
        throw new Error('朋友圈不存在或已被删除');
      }

      // 格式化数据
      targetCircle.formattedTime = util.formatRelativeTime(targetCircle.createdAt);
      targetCircle.memberCount = targetCircle.members ? targetCircle.members.length : 0;

      this.setData({
        circle: targetCircle
      });

      // 使用postStore加载帖子
      await this.loadPosts(this.data.circleId);

    } catch (error) {
      console.error('加载朋友圈详情失败:', error);
      util.showToast('加载失败');
      
      // 如果加载失败，返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },



  // 返回主页面
  navigateBack() {
    util.navigateToMain();
  },

  // 显示更多选项
  showMoreOptions() {
    wx.showActionSheet({
      itemList: ['分享朋友圈', '邀请朋友', '朋友圈设置'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.shareToMoments();
            break;
          case 1:
            this.inviteFriends();
            break;
          case 2:
            this.openSettings();
            break;
        }
      }
    });
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

  // 添加用户
  addUser() {
    wx.showToast({
      title: '添加用户功能开发中',
      icon: 'none'
    });
  },

  // 分享到朋友圈
  shareToMoments() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  // 邀请朋友
  inviteFriends() {
    wx.showToast({
      title: '邀请朋友功能开发中',
      icon: 'none'
    });
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
  }
});