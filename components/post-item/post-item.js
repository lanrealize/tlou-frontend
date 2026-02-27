// components/post-item/post-item.js
const { buildCharList } = require('../../utils/animatedText');
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
    // 是否是列表中的第一个
    isFirst: {
      type: Boolean,
      value: false
    },
    // 🎬 分享动画相关：是否隐藏图片（用于动画过渡）
    hideImage: {
      type: Boolean,
      value: false
    },
    // 🕐 时间轴模式：启用紧凑布局（时间+头像+用户名在第一行）
    timelineMode: {
      type: Boolean,
      value: false
    },
    // 🎬 onboarding 模式：用于引导页展示，样式微调
    onboardingMode: {
      type: Boolean,
      value: false
    },
    // 🎬 onboarding 动画：隐藏评论区（用于分阶段动画引导）
    hideComments: {
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
    // AI 头像模式（按评论id独立控制）
    aiAvatarModes: {},
    // 评论展开状态
    commentsExpanded: false,
    // 最多显示的评论数量
    maxCommentsShow: 3,
    // 弹出菜单显示状态
    showActionsMenu: false,
    // 单张图片的方向和样式信息
    singleImageInfo: {
      isPortrait: false,
      mode: 'aspectFit',
      styleClass: '',
      // 精确的显示尺寸，用于占位 - 设置最小值1，避免0或undefined导致的样式问题
      displayWidth: 1,
      displayHeight: 1
    },
    // 图片加载状态管理
    imageLoadStates: {},  // 记录每张图片的加载状态
    // 当前用户是否点赞（计算属性）
    isLiked: false,
    // 文本展开状态
    textExpanded: false,
    // 是否需要展开/收起按钮
    needTextToggle: false,
    // 折叠状态显示的文本（截断后的）
    collapsedText: '',
    // 文本切换动画状态
    textAnimating: false,
    // 评论展开状态 - 使用对象存储每条评论的状态
    commentTextStates: {}, // { commentId: { expanded, needToggle, collapsedText, animating } }
    // AI 评论逐字动画字符列表
    aiCommentChars: {}, // { commentId: [{char, delay}] }
    // onboarding 模式下已显示的评论 id 集合
    visibleCommentIds: {},
    // AI 评论头部状态：{ commentId: { showStatus, showTime, statusAnim, timeAnim } }
    aiHeaderStates: {},
    // onboarding 视频状态
    videoReady: false,
    showVideoLoading: false,
  },

  /**
   * 数据监听器
   */
  observers: {
    'post.comments': function(comments) {
      if (!comments || !Array.isArray(comments)) return;

      // 检查是否有新评论（未处理过的）
      const newComment = comments.find(c => {
        return c._isNew && !this._isProcessingComment(c._id);
      });

      if (newComment) {
        this._markCommentAsProcessing(newComment._id);
        this.handleNewComment(newComment);
      }
    },
    // 监听post对象变化，立即设置样式和初始化状态
    'post': function(post) {
      if (post && post.images && post.images.length > 0) {
        // 立即根据后端数据设置尺寸，确保骨架屏一开始就是正确尺寸
        this.setSingleImageStyleFromMeta();
        this.initImageLoadStates();
      }
      // post 对象变化时也需要更新点赞状态
      this.updateLikedStatus();

      // post 整体替换时，post.comments observer 不会触发，手动检查新评论
      if (post && Array.isArray(post.comments)) {
        const newComment = post.comments.find(c => c._isNew && !this._isProcessingComment(c._id));
        if (newComment) {
          this._markCommentAsProcessing(newComment._id);
          this.handleNewComment(newComment);
        }
      }
    },
    // 监听用户变化，更新点赞状态
    'currentUser._id': function() {
      this.updateLikedStatus();
    },
    // 监听 hideImage 属性变化
    'hideImage': function(value) {
      // hideImage 用于分享动画时隐藏第一张图片
    },
    // 监听帖子内容变化，检查是否需要展开/收起按钮
    'post.content': function(content) {
      this.checkTextLength();
    },
    // 监听评论列表变化，初始化评论文字状态
    'post.comments': function(comments) {
      if (comments && comments.length > 0) {
        this.initCommentTextStates();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // ─── onboarding 视频控制 ───
    startOnboardingVideo() {
      const ctx = wx.createVideoContext('onboarding-video', this);
      ctx.play();
      // 1s 后还没触发 bindplay，显示 loading
      this._videoLoadTimer = setTimeout(() => {
        if (!this.data.videoReady) {
          this.setData({ showVideoLoading: true });
        }
      }, 1000);
    },

    onVideoCanPlay() {
      clearTimeout(this._videoLoadTimer);
      this.setData({ videoReady: true, showVideoLoading: false });
    },

    onVideoEnded() {
      this.triggerEvent('videoended');
    },

    onVideoError(e) {
      console.error('[video] error:', e.detail);
    },

    /**
     * 🎬 获取图片位置信息（供分享动画使用）
     * @returns {Promise<Object>} 图片的 boundingClientRect 信息
     */
    getImageRect() {
      return new Promise((resolve, reject) => {
        const postId = this.data.post?._id;
        if (!postId) {
          reject(new Error('No post ID'));
          return;
        }
        
        // 尝试多种选择器
        const selectors = [
          `#post-image-${postId}-0`,     // ID选择器
          '.post-image-single',           // class选择器
          '.single-image image'           // 容器选择器
        ];
        
        const trySelector = (index = 0) => {
          if (index >= selectors.length) {
            reject(new Error('Image not found'));
            return;
          }
          
          wx.createSelectorQuery()
            .in(this)  // 🔑 关键：在组件实例内查询
            .select(selectors[index])
            .boundingClientRect()
            .exec((res) => {
              if (res[0]) {
                resolve(res[0]);
              } else {
                trySelector(index + 1);
              }
            });
        };
        
        trySelector(0);
      });
    },

    /**
     * 🖼️ 检查第一张图片是否已加载完成（骨架屏已消失）
     * @returns {boolean} true表示图片已完全加载且骨架屏已消失
     */
    isFirstImageFullyLoaded() {
      const { post, imageLoadStates } = this.data;
      
      if (!post || !post.images || post.images.length === 0) {
        return false;
      }
      
      const firstImage = post.images[0];
      const imageUrl = typeof firstImage === 'object' ? firstImage.url : firstImage;
      const loadState = imageLoadStates[imageUrl];
      
      // 必须是'show'状态，才表示图片已加载且骨架屏已消失
      return loadState === 'show';
    },

    /**
     * 更新点赞状态到 data
     * 由 observer 自动调用
     */
    updateLikedStatus() {
      const isLiked = this._computeIsLiked();
      if (this.data.isLiked !== isLiked) {
        this.setData({ isLiked });
      }
    },

    /**
     * 计算当前用户是否点赞了该帖子
     * @returns {boolean} 是否点赞
     * @private
     */
    _computeIsLiked() {
      const { post, currentUser } = this.data;
      
      // 如果没有帖子数据或用户信息，默认为未点赞
      if (!post || !currentUser || !currentUser._id) {
        return false;
      }
      
      // 优先使用 likedUsers 数组（包含完整用户信息，更可靠）
      const likedUsers = post.likedUsers || [];
      const currentUserId = currentUser._id.toString();
      
      if (likedUsers.length > 0) {
        return likedUsers.some(user => user._id.toString() === currentUserId);
      }
      
      // 降级方案：使用 likes ID 数组（为了兼容旧数据）
      const likes = post.likes || [];
      if (likes.length > 0) {
        return likes.some(likeId => {
          const actualId = typeof likeId === 'object' ? likeId._id : likeId;
          const normalizedLikeId = actualId ? actualId.toString() : '';
          return normalizedLikeId === currentUserId;
        });
      }
      
      return false;
    },
    
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
      
      let needsCrop = false;
      if (isPortrait) {
        // 纵向图片：固定高度460rpx，宽度按比例缩放
        displayHeight = 460;
        displayWidth = Math.round(460 * (originalWidth / originalHeight));
        // 限制最大宽度500rpx
        if (displayWidth > 500) {
          displayWidth = 500;
          displayHeight = Math.round(500 * (originalHeight / originalWidth));
        }
        // 限制最小宽高比 2:3，过窄时裁剪填充
        const minWidth = Math.round(displayHeight * 2 / 3);
        needsCrop = displayWidth < minWidth;
        if (needsCrop) {
          displayWidth = minWidth;
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
          mode: isPortrait ? (needsCrop ? 'aspectFill' : 'heightFix') : 'widthFix',
          styleClass: isPortrait ? (needsCrop ? 'portrait-crop' : 'portrait') : 'landscape',
          displayWidth: displayWidth,
          displayHeight: displayHeight
        }
      });
    },

    // 检查评论是否正在处理中
    _isProcessingComment(commentId) {
      if (!this._processedCommentIds) {
        this._processedCommentIds = new Set();
      }
      return this._processedCommentIds.has(commentId);
    },

    // 标记评论为处理中
    _markCommentAsProcessing(commentId) {
      if (!this._processedCommentIds) {
        this._processedCommentIds = new Set();
      }
      this._processedCommentIds.add(commentId);
    },

    // 处理新评论（自动展开）
    handleNewComment(newComment) {
      const { post, commentsExpanded, maxCommentsShow } = this.data;

      if (!newComment || !post || !post.comments) return;

      const commentIndex = post.comments.findIndex(c => c._id === newComment._id);
      if (commentIndex === -1) return;

      if (commentIndex >= maxCommentsShow && !commentsExpanded) {
        this.setData({ commentsExpanded: true });
      }

      // AI 评论生成逐字动画字符列表
      if (newComment.author && newComment.author._id === 'ai' && newComment.content) {
        const chars = buildCharList(newComment.content, 40, 0);
        this.setData({ [`aiCommentChars.${newComment._id}`]: chars });
      }

      // 渲染完成后查询评论节点位置，通知页面滚动
      wx.nextTick(() => {
        wx.createSelectorQuery()
          .in(this)
          .select(`#comment-${newComment._id}`)
          .boundingClientRect()
          .selectViewport()
          .boundingClientRect()
          .exec(([commentRect, viewportRect]) => {
            if (!commentRect || !viewportRect) return;
            this.triggerEvent('scrollToComment', { commentTop: commentRect.top, viewportHeight: viewportRect.height });
          });
      });
    },

    // 更新显示的评论列表（兼容旧逻辑，现在只是空函数）
    updateDisplayComments() {
      // 不再需要 displayComments，所有评论通过 CSS 控制显示/隐藏
    },

    // 点击单条 AI 评论文字重播动画
    onTapAiCommentText(e) {
      const id = e.currentTarget.dataset.commentId;
      const comments = this.data.post && this.data.post.comments;
      const comment = comments && comments.find(c => c._id === id);
      if (!comment) return;
      this.setData({ [`aiCommentChars.${id}`]: null }, () => {
        wx.nextTick(() => {
          this.setData({ [`aiCommentChars.${id}`]: buildCharList(comment.content, 40, 0) });
        });
      });
    },

    // 外部调用：触发所有 AI 评论的逐字动画（用于 onboarding）
    animateAiComments() {
      const comments = (this.data.post && this.data.post.comments || [])
        .filter(c => c.author && c.author._id === 'ai' && (c.content || c.aiStatus));
      if (!comments.length) return;

      this.setData({ aiCommentChars: {} }, () => {
        wx.nextTick(() => this._animateCommentAt(comments, 0));
      });
    },

    _animateCommentAt(comments, index) {
      if (index >= comments.length) {
        this.triggerEvent('commentsdone');
        return;
      }
      const c = comments[index];
      const hasContent = !!c.content;
      const chars = hasContent ? buildCharList(c.content, 40, 0) : [];
      const duration = hasContent ? chars.length * 40 + 400 : null; // null = 不自动推进

      const update = {
        [`visibleCommentIds.${c._id}`]: true,
        [`aiHeaderStates.${c._id}`]: c.aiStatus ? {
          showStatus: true, showTime: false,
          statusAnim: 'slide-up-in', timeAnim: '',
        } : {
          showStatus: false, showTime: true,
          statusAnim: '', timeAnim: 'slide-up-in',
        },
      };
      if (hasContent) update[`aiCommentChars.${c._id}`] = chars;

      this.setData(update, () => {
        if (duration !== null) {
          setTimeout(() => this._animateCommentAt(comments, index + 1), duration);
        }
        // content 为空时（思考中），由 startAiReply 结束后手动触发下一条
        else {
          this._pendingComments = { comments, nextIndex: index + 1 };
        }
      });
    },

    /**
     * 开始 AI 逐字回复（header 切换后调用）
     * 产品中：后端开始流式返回时调用
     * @param {string} commentId
     * @param {string} content
     */
    startAiReply(commentId, content) {
      const chars = buildCharList(content, 40, 0);
      const duration = chars.length * 40 + 1400; // +1000ms 额外间隔再推进下一条
      this.setData({ [`aiCommentChars.${commentId}`]: chars }, () => {
        // 逐字动画结束后，继续推进后续评论
        if (this._pendingComments) {
          const { comments, nextIndex } = this._pendingComments;
          this._pendingComments = null;
          setTimeout(() => this._animateCommentAt(comments, nextIndex), duration);
        }
      });
    },

    /**
     * 切换 AI 头部：shimmer 滑出，时间滑入
     * 在后端开始回复时调用（产品中）或 mock setTimeout 后调用
     * @param {string} commentId
     */
    transitionAiHeader(commentId) {
      // shimmer 滑出
      this.setData({ [`aiHeaderStates.${commentId}.statusAnim`]: 'slide-up-out' });
      // 0.25s 后（滑出完成）：隐藏 shimmer，时间滑入
      setTimeout(() => {
        this.setData({
          [`aiHeaderStates.${commentId}.showStatus`]: false,
          [`aiHeaderStates.${commentId}.showTime`]: true,
          [`aiHeaderStates.${commentId}.timeAnim`]: 'slide-up-in',
        });
      }, 250);
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

    // 点击 AI 头像切换动态/静态
    onTapAiAvatar(e) {
      const id = e.currentTarget.dataset.commentId;
      const current = this.data.aiAvatarModes[id] || 'static';
      const next = current === 'static' ? 'dynamic' : 'static';
      this.setData({ [`aiAvatarModes.${id}`]: next });
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

    // 切换操作菜单显示状态
    toggleActionsMenu() {
      this.setData({
        showActionsMenu: !this.data.showActionsMenu
      });
    },

    // 隐藏操作菜单
    hideActionsMenu() {
      this.setData({
        showActionsMenu: false
      });
    },

    // 从弹出菜单点赞
    onLikeFromPopup() {
      this.hideActionsMenu();
      this.onLike();
    },

    // 从弹出菜单评论
    onCommentFromPopup() {
      this.hideActionsMenu();
      this.onComment();
    },

    // 从弹出菜单删除
    onDeleteFromPopup() {
      this.hideActionsMenu();
      this.onDeletePost();
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
      // 确保 imageSrc 是有效的字符串
      if (!imageSrc || typeof imageSrc !== 'string') {
        console.warn('onImageLoaded: 无效的图片URL', imageSrc);
        return;
      }
      
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
      // 确保获取到有效的图片URL
      if (!imageSrc) {
        console.warn('onGridImageLoad: 无法获取图片URL', e.currentTarget.dataset);
        return;
      }
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
        
        // 确保 imageSrc 是有效的字符串
        if (!imageSrc || typeof imageSrc !== 'string') {
          console.warn('initImageLoadStates: 无效的图片数据', imgItem);
          return;
        }
        
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
    },

    /**
     * 检查文本长度，判断是否需要展开/收起按钮
     * 使用字符数作为简单判断标准，并生成截断文本
     */
    checkTextLength() {
      const { post } = this.data;
      if (!post || !post.content) {
        this.setData({ 
          needTextToggle: false,
          collapsedText: ''
        });
        return;
      }

      const content = post.content;
      // 粗略估算：约80个字符（留出空间给"全文"按钮）
      const maxCollapsedLength = 70;
      
      // 如果文本超过限制，需要折叠
      const needToggle = content.length > maxCollapsedLength;
      
      // 生成折叠状态显示的文本（截断后的文本）
      let collapsedText = '';
      if (needToggle) {
        collapsedText = content.substring(0, maxCollapsedLength);
        // 如果截断位置不是完整的词，可以稍微往前找最后一个标点或空格
        // 为简单起见，这里直接截断
      }
      
      this.setData({ 
        needTextToggle: needToggle,
        collapsedText: collapsedText,
        textExpanded: false  // 初始状态为收起
      });
    },

    /**
     * 切换文本展开/收起状态（带动画效果）
     */
    toggleText() {
      // 先淡出
      this.setData({ textAnimating: true });
      
      // 等淡出完成后切换内容
      setTimeout(() => {
        this.setData({
          textExpanded: !this.data.textExpanded
        });
        
        // 切换内容后立即开始淡入
        setTimeout(() => {
          this.setData({ textAnimating: false });
        }, 20);
      }, 150);
    },

    /**
     * 初始化评论文字状态
     */
    initCommentTextStates() {
      const { post, commentTextStates } = this.data;
      if (!post || !post.comments || !Array.isArray(post.comments)) return;

      const newStates = { ...commentTextStates };
      let hasChanges = false;

      post.comments.forEach(comment => {
        if (!comment || !comment._id || !comment.content) return;
        
        const commentId = comment._id;
        
        // 如果这条评论已经有状态了，跳过
        if (newStates[commentId]) return;

        const content = comment.content;
        const maxLength = 40; // 约两行的长度，留出空间给"全文"按钮
        const needToggle = content.length > maxLength;

        newStates[commentId] = {
          expanded: false,
          needToggle: needToggle,
          collapsedText: needToggle ? content.substring(0, maxLength) : '',
          animating: false
        };

        hasChanges = true;
      });

      if (hasChanges) {
        this.setData({ commentTextStates: newStates });
      }
    },

    /**
     * 切换评论展开/收起状态
     */
    toggleCommentText(e) {
      const { commentId } = e.currentTarget.dataset;
      if (!commentId) return;

      const { commentTextStates } = this.data;
      const state = commentTextStates[commentId];
      if (!state) return;

      // 设置动画状态
      const newStates = { ...commentTextStates };
      newStates[commentId] = { ...state, animating: true };
      this.setData({ commentTextStates: newStates });

      // 等淡出完成后切换内容
      setTimeout(() => {
        const updatedStates = { ...this.data.commentTextStates };
        updatedStates[commentId] = {
          ...updatedStates[commentId],
          expanded: !updatedStates[commentId].expanded
        };
        this.setData({ commentTextStates: updatedStates });

        // 切换内容后立即开始淡入
        setTimeout(() => {
          const finalStates = { ...this.data.commentTextStates };
          finalStates[commentId] = {
            ...finalStates[commentId],
            animating: false
          };
          this.setData({ commentTextStates: finalStates });
        }, 20);
      }, 150);
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时立即尝试设置图片样式（基于现有数据）
      this.setSingleImageStyleFromMeta();
      // 初始化图片加载状态
      this.initImageLoadStates();
      // 初始化点赞状态
      this.updateLikedStatus();
      // 检查文本长度
      this.checkTextLength();
      // 初始化评论文字状态
      this.initCommentTextStates();
    },
    
    ready() {
      // 组件布局完成后，再次确保图片样式正确
      this.setSingleImageStyleFromMeta();
      // 确保图片加载状态初始化
      this.initImageLoadStates();
      // 再次检查文本长度（此时DOM已渲染）
      this.checkTextLength();
      // 再次初始化评论文字状态
      this.initCommentTextStates();
    },
    
    detached() {
      // 清理已处理评论的记录
      if (this._processedCommentIds) {
        this._processedCommentIds.clear();
        this._processedCommentIds = null;
      }
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