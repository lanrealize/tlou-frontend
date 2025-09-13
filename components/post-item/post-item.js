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
    },
    // 是否显示操作菜单（由外部控制）
    showActionsMenu: {
      type: Boolean,
      value: false
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
    displayComments: [],
    // 移除了内部菜单状态，现在由外部控制
    // 单张图片的方向和样式信息
    singleImageInfo: {
      isPortrait: false,
      mode: 'aspectFit',
      styleClass: '',
      // 精确的显示尺寸，用于占位
      displayWidth: 0,
      displayHeight: 0
    },
    // 图片加载状态管理
    imageLoadStates: {}  // 记录每张图片的加载状态
  },

  /**
   * 数据监听器
   */
  observers: {
    'post.comments, commentsExpanded': function(comments, expanded) {
      this.updateDisplayComments();
    },
    // 监听post对象变化，立即设置样式和初始化状态
    'post': function(post) {
      if (post && post.images && post.images.length > 0) {
        // 立即根据后端数据设置尺寸，确保骨架屏一开始就是正确尺寸
        this.setSingleImageStyleFromMeta();
        this.initImageLoadStates();
      }
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    // 组件实例刚创建好时
    created() {
      // 组件实例刚创建好，还不能调用 setData
    },
    
    // 组件完全初始化完毕后
    ready() {
      // 🔧 组件准备完毕，立即根据数据设置图片尺寸
      const { post } = this.data;
      if (post && post.images && post.images.length > 0) {
        this.setSingleImageStyleFromMeta();
        this.initImageLoadStates();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 根据服务端图片尺寸信息设置单图样式
    setSingleImageStyleFromMeta() {
      const { post } = this.data;
      
      // 检查基础条件：必须是单张图片
      if (!post || !post.images || post.images.length !== 1) return;
      
      // 🔧 优先使用后端图片元数据计算准确尺寸
      const firstImage = post.images[0];
      
      // 检查图片对象本身是否包含尺寸信息
      if (typeof firstImage === 'object' && firstImage.width && firstImage.height) {
        this.calculateAndSetImageSize(firstImage.width, firstImage.height);
        return;
      }
      
      // 检查imageMeta数组
      if (post.imageMeta && post.imageMeta[0] && 
          typeof post.imageMeta[0].width === 'number' && 
          typeof post.imageMeta[0].height === 'number') {
        
        // ✅ 有准确的后端数据，立即计算正确的显示尺寸
        const meta = post.imageMeta[0];
        this.calculateAndSetImageSize(meta.width, meta.height);
        return;
      }
      
      // ⚠️ 后端数据缺失的降级方案（仅作为备用）
      if (!this.data.singleImageInfo.styleClass) {
        this.setData({
          singleImageInfo: {
            isPortrait: false,
            mode: 'widthFix',
            styleClass: 'landscape',
            displayWidth: 500,
            displayHeight: 375  // 4:3 比例作为最后的默认值
          }
        });
      }
    },

    // 🆕 根据原始尺寸计算并设置显示尺寸（统一的计算逻辑）
    calculateAndSetImageSize(originalWidth, originalHeight) {
      const isPortrait = originalHeight > originalWidth;
      
      let displayWidth, displayHeight;
      
      if (isPortrait) {
        // 纵向图片：固定高度460rpx，宽度按比例缩放
        displayHeight = 460;
        displayWidth = Math.round(460 * (originalWidth / originalHeight));
        // 限制最大宽度500rpx
        if (displayWidth > 500) {
          displayWidth = 500;
          displayHeight = Math.round(500 * (originalHeight / originalWidth));
        }
      } else {
        // 横向图片：固定宽度500rpx，高度按比例缩放
        displayWidth = 500;
        displayHeight = Math.round(500 * (originalHeight / originalWidth));
        // 限制最大高度460rpx
        if (displayHeight > 460) {
          displayHeight = 460;
          displayWidth = Math.round(460 * (originalWidth / originalHeight));
        }
      }
      
      // 设置准确的样式和尺寸
      this.setData({
        singleImageInfo: {
          isPortrait: isPortrait,
          mode: isPortrait ? 'heightFix' : 'widthFix',
          styleClass: isPortrait ? 'portrait' : 'landscape',
          displayWidth: displayWidth,
          displayHeight: displayHeight
        }
      });
    },

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
      const { userId, username, commentId } = e.currentTarget.dataset;
      
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
        replyToUser: { id: userId, username },
        commentId: commentId  // 传递评论ID用于滚动定位
      });
    },

    // 预览图片
    onPreviewImage(e) {
      const { current } = e.currentTarget.dataset;
      const images = this.data.post.images || [];
      
      // 处理图片数组，提取URL
      const urls = images.map(img => typeof img === 'object' ? img.url : img);
      
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

    // 点击评论头像
    onTapCommentAvatar(e) {
      const { user } = e.currentTarget.dataset;
      this.triggerEvent('tapAvatar', {
        user: user,
        post: this.data.post
      });
    },

    // 操作菜单现在由外部控制，移除了相关方法

    // 从弹出菜单点赞
    onLikeFromPopup() {
      this.triggerEvent('hideActionsMenu');
      this.onLike();
    },

    // 从弹出菜单评论
    onCommentFromPopup() {
      this.triggerEvent('hideActionsMenu');
      this.onComment();
    },

    // 从弹出菜单删除
    onDeleteFromPopup() {
      this.triggerEvent('hideActionsMenu');
      this.onDeletePost();
    },

    // 隐藏操作菜单（点击遮罩层时调用）
    hideActionsMenu() {
      this.triggerEvent('hideActionsMenu');
    },

    // 单张图片加载完成，检测图片方向（降级方案）
    onSingleImageLoad(e) {
      const { post, singleImageInfo } = this.data;
      
      // 无论如何都要处理图片加载完成事件
      const firstImage = this.data.post.images[0];
      const imageUrl = typeof firstImage === 'object' ? firstImage.url : firstImage;
      this.onImageLoaded(imageUrl);
      
      // 🔧 如果已经有后端数据，无需使用降级方案
      if (post && post.imageMeta && post.imageMeta[0] && 
          typeof post.imageMeta[0].width === 'number' && 
          typeof post.imageMeta[0].height === 'number') {
        return;
      }
      
      // 如果已有非默认样式，也无需重新设置
      if (singleImageInfo && singleImageInfo.displayWidth && 
          singleImageInfo.displayHeight && singleImageInfo.displayHeight !== 375) {
        return;
      }
      
      // 🔧 降级方案：从图片加载事件获取尺寸，使用统一计算逻辑
      const { width: originalWidth, height: originalHeight } = e.detail;
      this.calculateAndSetImageSize(originalWidth, originalHeight);
    },
    
    // 处理图片加载完成
    onImageLoaded(imageSrc) {
      const { imageLoadStates } = this.data;
      const newLoadStates = { ...imageLoadStates };
      newLoadStates[imageSrc] = 'loaded';
      
      this.setData({
        imageLoadStates: newLoadStates
      });
      
      // 添加轻微延迟，让骨架屏动画更自然
      setTimeout(() => {
        const updatedStates = { ...this.data.imageLoadStates };
        updatedStates[imageSrc] = 'show';
        this.setData({
          imageLoadStates: updatedStates
        });
      }, 150);
    },
    
    // 处理图片加载失败
    onImageError(e) {
      const imageSrc = e.currentTarget.dataset.src;
      const { imageLoadStates } = this.data;
      const newLoadStates = { ...imageLoadStates };
      newLoadStates[imageSrc] = 'error';
      
      this.setData({
        imageLoadStates: newLoadStates
      });
    },
    

    
    // 多张图片加载完成处理
    onGridImageLoad(e) {
      const imageSrc = e.currentTarget.dataset.src;
      this.onImageLoaded(imageSrc);
    },
    
    // 初始化图片加载状态
    initImageLoadStates() {
      const { post, imageLoadStates } = this.data;
      if (!post || !post.images || !Array.isArray(post.images)) return;
      
      const newImageLoadStates = { ...imageLoadStates };
      let hasChanges = false;
      
      post.images.forEach(imgItem => {
        // 处理图片数据，支持对象和字符串格式
        const imageSrc = typeof imgItem === 'object' ? imgItem.url : imgItem;
        
        // 只为没有状态的图片设置初始loading状态
        if (!newImageLoadStates[imageSrc]) {
          newImageLoadStates[imageSrc] = 'loading';
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        this.setData({
          imageLoadStates: newImageLoadStates
        });
      }
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时立即尝试设置图片样式（基于现有数据）
      this.setSingleImageStyleFromMeta();
      // 初始化评论显示
      this.updateDisplayComments();
      // 初始化图片加载状态
      this.initImageLoadStates();
    },
    
    ready() {
      // 组件布局完成后，再次确保图片样式正确
      this.setSingleImageStyleFromMeta();
      // 确保图片加载状态初始化
      this.initImageLoadStates();
    },
    
    detached() {
      // 组件卸载时的逻辑
    }
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