// pages/details/details.js
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    circleId: '',         // 朋友圈ID
    circle: null,         // 朋友圈详情
    posts: [],            // 朋友圈帖子列表
    loading: false,       // 加载状态
    commentText: '',      // 评论内容
    replyToUser: null,    // 回复的用户
    selectedPostId: '',   // 当前选中的帖子ID（用于评论）
    showCommentInput: false, // 是否显示评论输入框
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44
    }
  },

  onLoad(options) {
    this.getSafeAreaInfo();
    
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
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCircleDetail().finally(() => {
      wx.stopPullDownRefresh();
    });
  },



  // 加载朋友圈详情
  async loadCircleDetail() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 获取朋友圈信息
      const circlesRes = await api.circles.getMy();
      const targetCircle = circlesRes.data.circles.find(c => c._id === this.data.circleId);
      
      if (!targetCircle) {
        throw new Error('朋友圈不存在或已被删除');
      }

      // 获取朋友圈的帖子列表
      const postsRes = await api.posts.getList(this.data.circleId);
      const posts = postsRes.data.posts || [];

      // 格式化数据
      targetCircle.formattedTime = util.formatRelativeTime(targetCircle.createdAt);
      targetCircle.memberCount = targetCircle.members ? targetCircle.members.length : 0;

      posts.forEach(post => {
        post.formattedTime = util.formatRelativeTime(post.createdAt);
        post.isLiked = post.likes && post.likes.includes(getApp().globalData.openid);
        
        // 格式化评论时间
        if (post.comments) {
          post.comments.forEach(comment => {
            comment.formattedTime = util.formatRelativeTime(comment.createdAt);
          });
        }
      });

      this.setData({
        circle: targetCircle,
        posts: posts,
        loading: false
      });

    } catch (error) {
      console.error('加载朋友圈详情失败:', error);
      util.showToast('加载失败');
      this.setData({ loading: false });
      
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

  // 点赞/取消点赞
  async toggleLike(e) {
    const { postId } = e.currentTarget.dataset;
    if (!postId) return;

    try {
      const res = await api.posts.like(postId);
      const liked = res.data.liked;

      // 更新本地数据
      const posts = [...this.data.posts];
      const postIndex = posts.findIndex(p => p._id === postId);
      
      if (postIndex !== -1) {
        posts[postIndex].isLiked = liked;
        
        if (liked) {
          posts[postIndex].likes = posts[postIndex].likes || [];
          posts[postIndex].likes.push(getApp().globalData.openid);
        } else {
          posts[postIndex].likes = posts[postIndex].likes.filter(id => id !== getApp().globalData.openid);
        }
      }

      this.setData({ posts });
      util.showToast(liked ? '点赞成功' : '取消点赞');

    } catch (error) {
      console.error('点赞操作失败:', error);
      util.showToast('操作失败');
    }
  },

  // 显示评论输入框
  showCommentInput(e) {
    const { postId } = e.currentTarget.dataset;
    this.setData({
      showCommentInput: true,
      selectedPostId: postId,
      replyToUser: null,
      commentText: ''
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
    this.setData({ commentText: e.detail.value });
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
        replyToUserId: replyToUser ? replyToUser.id : undefined
      };

      await api.posts.addComment(selectedPostId, data);

      util.showToast('评论成功');

      // 隐藏输入框并清空内容
      this.setData({
        showCommentInput: false,
        commentText: '',
        replyToUser: null,
        selectedPostId: ''
      });

      // 重新加载朋友圈详情
      this.loadCircleDetail();

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
      selectedPostId: ''
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