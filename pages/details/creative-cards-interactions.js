/**
 * 创意卡片交互系统 - JavaScript交互逻辑示例
 * 这个文件展示了如何为新的创意卡片系统添加丰富的交互功能
 */

// 在details.js的data中添加这些数据
const cardInteractionData = {
  currentCardIndex: 0,
  cardTouchStart: { x: 0, y: 0 },
  cardTouchCurrent: { x: 0, y: 0 },
  isCardDragging: false,
  cardAnimating: false,
  
  // 随机渐变背景数组
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

// 卡片交互方法
const cardInteractionMethods = {
  
  /**
   * 卡片点击事件 - 展开卡片详情
   */
  onCardTap(e) {
    const { index, post } = e.currentTarget.dataset;
    
    if (this.data.cardAnimating) return;
    
    // 添加点击动画
    this.animateCardTap(index);
    
    // 延迟执行导航，让动画完成
    setTimeout(() => {
      // 这里可以导航到帖子详情页面或展开卡片
      console.log('展开卡片详情:', post);
      // wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${post._id}` });
    }, 200);
  },

  /**
   * 卡片长按事件 - 显示快捷操作菜单
   */
  onCardLongPress(e) {
    const { post } = e.currentTarget.dataset;
    
    wx.vibrateShort(); // 震动反馈
    
    // 显示快捷操作菜单
    wx.showActionSheet({
      itemList: ['分享', '收藏', '举报', '删除'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.sharePost(post);
            break;
          case 1:
            this.favoritePost(post);
            break;
          case 2:
            this.reportPost(post);
            break;
          case 3:
            this.deletePost(post);
            break;
        }
      }
    });
  },

  /**
   * 卡片触摸开始 - 记录起始位置
   */
  onCardTouchStart(e) {
    if (this.data.cardAnimating) return;
    
    const touch = e.touches[0];
    this.setData({
      cardTouchStart: { x: touch.clientX, y: touch.clientY },
      cardTouchCurrent: { x: touch.clientX, y: touch.clientY },
      isCardDragging: false
    });
  },

  /**
   * 卡片触摸移动 - 实现卡片跟随手指移动
   */
  onCardTouchMove(e) {
    if (this.data.cardAnimating) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.cardTouchStart.x;
    const deltaY = touch.clientY - this.data.cardTouchStart.y;
    
    // 如果移动距离超过阈值，开始拖拽
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.setData({
        isCardDragging: true,
        cardTouchCurrent: { x: touch.clientX, y: touch.clientY }
      });
      
      // 实时更新卡片位置（可以通过动态样式实现）
      this.updateCardPosition(deltaX, deltaY);
    }
  },

  /**
   * 卡片触摸结束 - 处理滑动手势
   */
  onCardTouchEnd(e) {
    if (this.data.cardAnimating || !this.data.isCardDragging) return;
    
    const deltaX = this.data.cardTouchCurrent.x - this.data.cardTouchStart.x;
    const deltaY = this.data.cardTouchCurrent.y - this.data.cardTouchStart.y;
    
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
        this.likeCurrentCard(); // 向上滑动点赞
      } else {
        this.skipCurrentCard(); // 向下滑动跳过
      }
    }
    // 小幅移动，回弹到原位
    else {
      this.resetCardPosition();
    }
    
    this.setData({ isCardDragging: false });
  },

  /**
   * 切换到下一张卡片
   */
  nextCard() {
    if (this.data.currentCardIndex >= this.data.posts.length - 1) return;
    
    this.setData({ cardAnimating: true });
    
    // 执行卡片切换动画
    this.animateCardSwitch('next', () => {
      this.setData({
        currentCardIndex: this.data.currentCardIndex + 1,
        cardAnimating: false
      });
    });
  },

  /**
   * 切换到上一张卡片
   */
  previousCard() {
    if (this.data.currentCardIndex <= 0) return;
    
    this.setData({ cardAnimating: true });
    
    // 执行卡片切换动画
    this.animateCardSwitch('previous', () => {
      this.setData({
        currentCardIndex: this.data.currentCardIndex - 1,
        cardAnimating: false
      });
    });
  },

  /**
   * 快速点赞当前卡片
   */
  onQuickLike(e) {
    const { post } = e.currentTarget.dataset;
    
    // 添加点赞动画
    this.animateLikeButton(e.currentTarget);
    
    // 调用点赞接口
    this.onPostLike({ detail: { post } });
  },

  /**
   * 快速评论当前卡片
   */
  onQuickComment(e) {
    const { post } = e.currentTarget.dataset;
    
    // 显示评论输入框
    this.onPostComment({ detail: { post } });
  },

  /**
   * 导航点点击事件
   */
  onNavDotTap(e) {
    const { index } = e.currentTarget.dataset;
    const targetIndex = parseInt(index);
    
    if (targetIndex === this.data.currentCardIndex || this.data.cardAnimating) return;
    
    this.setData({ cardAnimating: true });
    
    // 执行跳转动画
    this.animateCardJump(targetIndex, () => {
      this.setData({
        currentCardIndex: targetIndex,
        cardAnimating: false
      });
    });
  },

  /**
   * 查看全部帖子
   */
  onViewAllPosts() {
    // 切换到传统列表视图或导航到专门的列表页面
    wx.showModal({
      title: '查看模式',
      content: '选择查看方式',
      confirmText: '列表模式',
      cancelText: '保持卡片',
      success: (res) => {
        if (res.confirm) {
          // 切换到列表模式
          this.switchToListMode();
        }
      }
    });
  },

  /**
   * 卡片头像点击
   */
  onCardAvatarTap(e) {
    const { user } = e.currentTarget.dataset;
    
    // 添加头像点击动画
    this.animateAvatarTap(e.currentTarget);
    
    // 导航到用户资料页
    setTimeout(() => {
      console.log('查看用户资料:', user);
      // wx.navigateTo({ url: `/pages/profile/profile?userId=${user._id}` });
    }, 150);
  },

  /**
   * 卡片更多操作
   */
  onCardMoreActions(e) {
    const { post } = e.currentTarget.dataset;
    
    wx.showActionSheet({
      itemList: ['编辑', '删除', '分享', '举报'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.editPost(post);
            break;
          case 1:
            this.deletePost(post);
            break;
          case 2:
            this.sharePost(post);
            break;
          case 3:
            this.reportPost(post);
            break;
        }
      }
    });
  },

  /**
   * 卡片图片点击 - 全屏预览
   */
  onCardImageTap(e) {
    const { current, post } = e.currentTarget.dataset;
    
    // 获取所有图片URL
    const urls = post.images.map(img => img.url || img);
    
    wx.previewImage({
      current,
      urls
    });
  },

  /**
   * 卡片图片长按 - 保存或分享
   */
  onCardImageLongPress(e) {
    const { current } = e.currentTarget.dataset;
    
    wx.vibrateShort();
    
    wx.showActionSheet({
      itemList: ['保存图片', '分享图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.saveImage(current);
        } else if (res.tapIndex === 1) {
          this.shareImage(current);
        }
      }
    });
  },

  // ===== 动画方法 =====

  /**
   * 卡片点击动画
   */
  animateCardTap(index) {
    const animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease-out'
    });
    
    animation.scale(0.95).step();
    animation.scale(1).step();
    
    this.setData({
      [`cardAnimation${index}`]: animation.export()
    });
  },

  /**
   * 点赞按钮动画
   */
  animateLikeButton(element) {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
    
    animation.scale(1.2).step({ duration: 150 });
    animation.scale(1).step({ duration: 150 });
    
    // 这里需要通过选择器来应用动画
    // 实际实现中可能需要不同的方法
  },

  /**
   * 头像点击动画
   */
  animateAvatarTap(element) {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
    
    animation.scale(1.1).step({ duration: 150 });
    animation.scale(1).step({ duration: 150 });
  },

  /**
   * 卡片切换动画
   */
  animateCardSwitch(direction, callback) {
    const animation = wx.createAnimation({
      duration: 400,
      timingFunction: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
    });
    
    if (direction === 'next') {
      animation.translateX(-100).opacity(0).step();
    } else {
      animation.translateX(100).opacity(0).step();
    }
    
    setTimeout(() => {
      animation.translateX(0).opacity(1).step();
      callback && callback();
    }, 200);
  },

  /**
   * 更新卡片位置（拖拽时）
   */
  updateCardPosition(deltaX, deltaY) {
    const animation = wx.createAnimation({
      duration: 0,
      timingFunction: 'linear'
    });
    
    const rotation = deltaX * 0.1; // 根据水平位移计算旋转角度
    animation.translateX(deltaX * 0.3).translateY(deltaY * 0.3).rotate(rotation).step();
    
    this.setData({
      cardDragAnimation: animation.export()
    });
  },

  /**
   * 重置卡片位置
   */
  resetCardPosition() {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
    
    animation.translateX(0).translateY(0).rotate(0).step();
    
    this.setData({
      cardDragAnimation: animation.export()
    });
  },

  // ===== 生命周期和初始化 =====

  /**
   * 初始化卡片系统
   */
  initCardSystem() {
    // 为每个帖子分配随机渐变背景
    const posts = this.data.posts.map((post, index) => ({
      ...post,
      gradientBg: this.data.gradientBackgrounds[index % this.data.gradientBackgrounds.length]
    }));
    
    this.setData({
      posts,
      currentCardIndex: 0,
      ...cardInteractionData
    });
  },

  /**
   * 切换到列表模式
   */
  switchToListMode() {
    // 实现模式切换逻辑
    this.setData({
      viewMode: 'list' // 可以用这个标志来控制显示模式
    });
  }
};

// 导出方法，在details.js中可以这样使用：
// Object.assign(Page的methods, cardInteractionMethods);

module.exports = {
  cardInteractionData,
  cardInteractionMethods
};
