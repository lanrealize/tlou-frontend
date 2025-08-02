// components/post-item/post-item.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 帖子数据
    post: {
      type: Object,
      value: {}
    },
    // 当前用户信息
    currentUser: {
      type: Object,
      value: {}
    },
    // 是否显示操作按钮（删除等）
    showActions: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 图片预览相关
    imageMode: 'aspectFill',
    // 评论展开状态
    commentsExpanded: false,
    // 最多显示的评论数量
    maxCommentsShow: 3,
    // 显示的评论列表
    displayComments: []
  },

  /**
   * 数据监听器
   */
  observers: {
    'post.comments, commentsExpanded': function(comments, expanded) {
      this.updateDisplayComments();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 更新显示的评论列表
    updateDisplayComments() {
      const { post, commentsExpanded, maxCommentsShow } = this.data;
      
      if (!post || !post.comments || !Array.isArray(post.comments)) {
        this.setData({
          displayComments: []
        });
        return;
      }

      let displayComments = [];
      
      if (commentsExpanded) {
        // 展开状态：显示所有评论
        displayComments = post.comments;
      } else {
        // 收起状态：显示前N条评论
        displayComments = post.comments.slice(0, maxCommentsShow);
      }
      
      this.setData({
        displayComments: displayComments
      });
      

    },

    // 点赞/取消点赞
    onLike() {
      this.triggerEvent('like', {
        postId: this.data.post._id,
        post: this.data.post
      });
    },

    // 评论
    onComment() {
      this.triggerEvent('comment', {
        postId: this.data.post._id,
        post: this.data.post
      });
    },

    // 回复评论（点击评论内容触发）
    onReplyComment(e) {
      const { userId, username } = e.currentTarget.dataset;
      
      // 检查必要数据
      if (!userId || !username) {
        wx.showToast({
          title: '回复失败：用户信息缺失',
          icon: 'none'
        });
        return;
      }
      
      this.triggerEvent('replyComment', {
        postId: this.data.post._id,
        post: this.data.post,
        replyToUser: { id: userId, username }
      });
    },

    // 预览图片
    onPreviewImage(e) {
      const { current } = e.currentTarget.dataset;
      const urls = this.data.post.images || [];
      
      this.triggerEvent('previewImage', {
        current,
        urls
      });
    },

    // 切换评论展开状态
    toggleComments() {
      const newExpanded = !this.data.commentsExpanded;
      this.setData({
        commentsExpanded: newExpanded
      });
      // 数据监听器会自动调用updateDisplayComments
    },

    // 删除帖子
    onDeletePost() {
      this.triggerEvent('deletePost', {
        postId: this.data.post._id,
        post: this.data.post
      });
    },

    // 删除评论
    onDeleteComment(e) {
      // 使用catchtap已经阻止了事件冒泡，无需手动调用stopPropagation
      
      const { commentId } = e.currentTarget.dataset;
      
      if (!commentId) {
        wx.showToast({
          title: '删除失败：评论ID缺失',
          icon: 'none'
        });
        return;
      }
      
      this.triggerEvent('deleteComment', {
        postId: this.data.post._id,
        commentId,
        post: this.data.post
      });
    },

    // 点击用户头像
    onTapAvatar() {
      this.triggerEvent('tapAvatar', {
        user: this.data.post.author,
        post: this.data.post
      });
    },

    // 长按帖子
    onLongPress() {
      if (this.data.showActions) {
        this.triggerEvent('longPress', {
          postId: this.data.post._id,
          post: this.data.post
        });
      }
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时初始化评论显示
      this.updateDisplayComments();
    },
    
    detached() {
      // 组件卸载时的逻辑
    }
  },

  /**
   * 数据更新时的处理
   */
  ready() {
    // 组件布局完成后初始化评论显示
    this.updateDisplayComments();
  },

  /**
   * 组件所在页面的生命周期
   */
  pageLifetimes: {
    show() {
      // 页面显示时
    },
    
    hide() {
      // 页面隐藏时
    }
  }
});