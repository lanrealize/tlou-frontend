/**
 * 增强版卡片交互系统 - 完整的JavaScript实现
 * 包含卡片滑动、详情弹窗、评论点赞等所有功能
 */

// 在details.js的data中添加这些数据
const enhancedCardData = {
  // 卡片相关
  currentCardIndex: 0,
  cardTransforms: {},
  cardAnimating: false,
  
  // 触摸相关
  touchStartX: 0,
  touchStartY: 0,
  touchCurrentX: 0,
  touchCurrentY: 0,
  isDragging: false,
  
  // 详情弹窗相关
  showCardDetail: false,
  currentDetailPost: null,
  
  // 渐变背景
  gradientBackgrounds: [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #fecfef 0%, #fecfef 100%)',
    'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)'
  ]
};

// 增强版卡片交互方法
const enhancedCardMethods = {
  
  /**
   * 初始化卡片系统
   */
  initEnhancedCardSystem() {
    console.log('初始化增强版卡片系统');
    
    // 为每个帖子分配随机渐变背景
    const posts = this.data.posts.map((post, index) => ({
      ...post,
      gradientBg: enhancedCardData.gradientBackgrounds[index % enhancedCardData.gradientBackgrounds.length]
    }));
    
    this.setData({
      posts,
      currentCardIndex: 0,
      cardTransforms: {},
      ...enhancedCardData
    });
  },

  /**
   * 卡片触摸开始
   */
  onCardTouchStart(e) {
    if (this.data.cardAnimating) return;
    
    const touch = e.touches[0];
    console.log('卡片触摸开始:', touch.clientX, touch.clientY);
    
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      touchCurrentX: touch.clientX,
      touchCurrentY: touch.clientY,
      isDragging: false
    });
  },

  /**
   * 卡片触摸移动
   */
  onCardTouchMove(e) {
    if (this.data.cardAnimating) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = touch.clientY - this.data.touchStartY;
    
    // 如果移动距离超过阈值，开始拖拽
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.setData({
        isDragging: true,
        touchCurrentX: touch.clientX,
        touchCurrentY: touch.clientY
      });
      
      // 更新卡片位置
      this.updateCardTransform(deltaX, deltaY);
    }
  },

  /**
   * 卡片触摸结束
   */
  onCardTouchEnd(e) {
    if (this.data.cardAnimating || !this.data.isDragging) {
      this.setData({ isDragging: false });
      return;
    }
    
    const deltaX = this.data.touchCurrentX - this.data.touchStartX;
    const deltaY = this.data.touchCurrentY - this.data.touchStartY;
    
    console.log('卡片触摸结束，位移:', deltaX, deltaY);
    
    // 水平滑动切换卡片
    if (Math.abs(deltaX) > 100) {
      if (deltaX > 0) {
        this.previousCard();
      } else {
        this.nextCard();
      }
    }
    // 垂直滑动执行其他操作
    else if (Math.abs(deltaY) > 100) {
      if (deltaY < 0) {
        // 向上滑动点赞
        this.quickLikeCurrentCard();
      } else {
        // 向下滑动跳过
        this.skipCurrentCard();
      }
    }
    // 小幅移动，回弹到原位
    else {
      this.resetCardTransform();
    }
    
    this.setData({ isDragging: false });
  },

  /**
   * 切换到下一张卡片
   */
  nextCard() {
    if (this.data.currentCardIndex >= this.data.posts.length - 1) {
      wx.showToast({
        title: '已经是最后一张了',
        icon: 'none',
        duration: 1000
      });
      this.resetCardTransform();
      return;
    }
    
    console.log('切换到下一张卡片');
    this.setData({ cardAnimating: true });
    
    // 执行切换动画
    this.animateCardSwitch('next', () => {
      this.setData({
        currentCardIndex: this.data.currentCardIndex + 1,
        cardAnimating: false
      });
      this.resetCardTransform();
    });
  },

  /**
   * 切换到上一张卡片
   */
  previousCard() {
    if (this.data.currentCardIndex <= 0) {
      wx.showToast({
        title: '已经是第一张了',
        icon: 'none',
        duration: 1000
      });
      this.resetCardTransform();
      return;
    }
    
    console.log('切换到上一张卡片');
    this.setData({ cardAnimating: true });
    
    // 执行切换动画
    this.animateCardSwitch('previous', () => {
      this.setData({
        currentCardIndex: this.data.currentCardIndex - 1,
        cardAnimating: false
      });
      this.resetCardTransform();
    });
  },

  /**
   * 更新卡片变换
   */
  updateCardTransform(deltaX, deltaY) {
    const currentIndex = this.data.currentCardIndex;
    const rotation = deltaX * 0.05; // 根据水平位移计算旋转角度
    const scale = 1 - Math.abs(deltaX) * 0.0001; // 根据位移计算缩放
    
    const transform = `translateX(${deltaX * 0.5}px) translateY(${deltaY * 0.3}px) rotate(${rotation}deg) scale(${scale})`;
    
    this.setData({
      [`cardTransforms[${currentIndex}]`]: transform
    });
  },

  /**
   * 重置卡片变换
   */
  resetCardTransform() {
    const currentIndex = this.data.currentCardIndex;
    this.setData({
      [`cardTransforms[${currentIndex}]`]: ''
    });
  },

  /**
   * 卡片切换动画
   */
  animateCardSwitch(direction, callback) {
    const currentIndex = this.data.currentCardIndex;
    
    // 设置退出动画
    const exitTransform = direction === 'next' 
      ? 'translateX(-100%) rotate(-10deg) scale(0.8)' 
      : 'translateX(100%) rotate(10deg) scale(0.8)';
    
    this.setData({
      [`cardTransforms[${currentIndex}]`]: exitTransform
    });
    
    // 延迟执行回调
    setTimeout(() => {
      callback && callback();
    }, 300);
  },

  /**
   * 快速点赞当前卡片
   */
  quickLikeCurrentCard() {
    const currentPost = this.data.posts[this.data.currentCardIndex];
    if (!currentPost) return;
    
    console.log('快速点赞当前卡片');
    wx.vibrateShort();
    
    // 显示点赞动画
    wx.showToast({
      title: currentPost.isLiked ? '取消点赞' : '点赞成功',
      icon: 'none',
      duration: 1000
    });
    
    // 调用点赞方法
    this.onQuickLike({ currentTarget: { dataset: { post: currentPost } } });
    this.resetCardTransform();
  },

  /**
   * 跳过当前卡片
   */
  skipCurrentCard() {
    console.log('跳过当前卡片');
    wx.vibrateShort();
    
    wx.showToast({
      title: '已跳过',
      icon: 'none',
      duration: 800
    });
    
    this.nextCard();
  },

  /**
   * 快速点赞
   */
  onQuickLike(e) {
    const { post } = e.currentTarget.dataset;
    console.log('快速点赞:', post._id);
    
    // 添加点击反馈
    wx.vibrateShort();
    
    // 调用原有的点赞方法
    this.onPostLike({ detail: { post } });
  },

  /**
   * 快速评论
   */
  onQuickComment(e) {
    const { post } = e.currentTarget.dataset;
    console.log('快速评论:', post._id);
    
    // 调用原有的评论方法
    this.onPostComment({ detail: { post } });
  },

  /**
   * 查看卡片详情
   */
  onViewCardDetail(e) {
    const { post } = e.currentTarget.dataset;
    console.log('查看卡片详情:', post._id);
    
    this.setData({
      showCardDetail: true,
      currentDetailPost: post
    });
  },

  /**
   * 关闭卡片详情
   */
  closeCardDetail() {
    console.log('关闭卡片详情');
    this.setData({
      showCardDetail: false,
      currentDetailPost: null
    });
  },

  /**
   * 详情页点赞
   */
  onDetailLike() {
    if (!this.data.currentDetailPost) return;
    
    console.log('详情页点赞:', this.data.currentDetailPost._id);
    wx.vibrateShort();
    
    // 调用原有的点赞方法
    this.onPostLike({ detail: { post: this.data.currentDetailPost } });
    
    // 更新详情页数据
    const updatedPost = this.data.posts.find(p => p._id === this.data.currentDetailPost._id);
    if (updatedPost) {
      this.setData({
        currentDetailPost: updatedPost
      });
    }
  },

  /**
   * 详情页评论
   */
  onDetailComment() {
    if (!this.data.currentDetailPost) return;
    
    console.log('详情页评论:', this.data.currentDetailPost._id);
    
    // 关闭详情页，打开评论输入框
    this.setData({
      showCardDetail: false
    });
    
    // 调用原有的评论方法
    this.onPostComment({ detail: { post: this.data.currentDetailPost } });
  },

  /**
   * 点击点赞用户
   */
  onTapLikedUser(e) {
    const { user } = e.currentTarget.dataset;
    console.log('查看点赞用户:', user);
    
    // 这里可以导航到用户资料页
    // wx.navigateTo({ url: `/pages/profile/profile?userId=${user._id}` });
  },

  /**
   * 点击评论用户
   */
  onTapCommentUser(e) {
    const { user } = e.currentTarget.dataset;
    console.log('查看评论用户:', user);
    
    // 这里可以导航到用户资料页
    // wx.navigateTo({ url: `/pages/profile/profile?userId=${user._id}` });
  },

  /**
   * 回复详情页评论
   */
  onReplyDetailComment(e) {
    const { user, commentId } = e.currentTarget.dataset;
    console.log('回复详情页评论:', user, commentId);
    
    // 关闭详情页
    this.setData({
      showCardDetail: false
    });
    
    // 设置回复用户信息
    this.setData({
      replyToUser: user,
      replyToCommentId: commentId,
      showCommentInput: true,
      focusInput: true
    });
  },

  /**
   * 删除详情页评论
   */
  onDeleteDetailComment(e) {
    const { commentId } = e.currentTarget.dataset;
    console.log('删除详情页评论:', commentId);
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用原有的删除评论方法
          this.onCommentDelete({ detail: { commentId } });
          
          // 更新详情页数据
          const updatedPost = this.data.posts.find(p => p._id === this.data.currentDetailPost._id);
          if (updatedPost) {
            this.setData({
              currentDetailPost: updatedPost
            });
          }
        }
      }
    });
  },

  /**
   * 导航点点击
   */
  onNavDotTap(e) {
    const { index } = e.currentTarget.dataset;
    const targetIndex = parseInt(index);
    
    if (targetIndex === this.data.currentCardIndex || this.data.cardAnimating) return;
    
    console.log('导航到卡片:', targetIndex);
    
    this.setData({
      cardAnimating: true,
      currentCardIndex: targetIndex,
      cardAnimating: false
    });
  },

  /**
   * 查看全部帖子
   */
  onViewAllPosts() {
    console.log('查看全部帖子');
    
    wx.showActionSheet({
      itemList: ['切换到列表模式', '保持卡片模式'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 切换到传统列表视图
          this.switchToListMode();
        }
      }
    });
  },

  /**
   * 切换到列表模式
   */
  switchToListMode() {
    console.log('切换到列表模式');
    
    // 可以通过设置一个标志来控制显示模式
    this.setData({
      viewMode: 'list'
    });
    
    wx.showToast({
      title: '已切换到列表模式',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 卡片点击事件
   */
  onCardTap(e) {
    // 如果正在拖拽，不触发点击事件
    if (this.data.isDragging) return;
    
    const { post } = e.currentTarget.dataset;
    console.log('卡片点击:', post._id);
    
    // 显示详情页
    this.onViewCardDetail(e);
  },

  /**
   * 卡片长按事件
   */
  onCardLongPress(e) {
    const { post } = e.currentTarget.dataset;
    console.log('卡片长按:', post._id);
    
    wx.vibrateShort();
    
    const itemList = ['分享', '收藏'];
    if (this.data.currentUser._id === post.author._id) {
      itemList.push('删除');
    }
    
    wx.showActionSheet({
      itemList,
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.sharePost(post);
            break;
          case 1:
            this.favoritePost(post);
            break;
          case 2:
            this.onPostDelete({ detail: { post } });
            break;
        }
      }
    });
  },

  /**
   * 分享帖子
   */
  sharePost(post) {
    console.log('分享帖子:', post._id);
    // 实现分享逻辑
  },

  /**
   * 收藏帖子
   */
  favoritePost(post) {
    console.log('收藏帖子:', post._id);
    wx.showToast({
      title: '已收藏',
      icon: 'success'
    });
  },

  // ===== 生命周期方法 =====

  /**
   * 页面加载时初始化
   */
  onLoadEnhanced() {
    // 在原有的onLoad方法中调用
    this.initEnhancedCardSystem();
  },

  /**
   * 页面显示时刷新数据
   */
  onShowEnhanced() {
    // 刷新当前卡片的详情数据
    if (this.data.showCardDetail && this.data.currentDetailPost) {
      const updatedPost = this.data.posts.find(p => p._id === this.data.currentDetailPost._id);
      if (updatedPost) {
        this.setData({
          currentDetailPost: updatedPost
        });
      }
    }
  }
};

// 使用说明：
// 在details.js中这样使用：
/*
Page({
  data: {
    ...原有data,
    ...enhancedCardData
  },
  
  ...原有methods,
  ...enhancedCardMethods,
  
  onLoad() {
    // 原有的onLoad逻辑
    this.onLoadEnhanced();
  },
  
  onShow() {
    // 原有的onShow逻辑
    this.onShowEnhanced();
  }
});
*/

module.exports = {
  enhancedCardData,
  enhancedCardMethods
};
