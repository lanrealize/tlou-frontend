/*
 * 滑动卡片组件 - 集成自cardSwipe项目
 * 适配tlou-frontend项目的帖子数据结构
 * @github: https://github.com/1esse/cardSwipe
 */

Component({
  properties: {
    posts: {
      type: Array,
      value: []
    }, // 帖子数据，替代原来的cards
    removedPosts: {
      type: Array,
      value: []
    }, // 存放已经移除的帖子索引
    transition: {
      type: Boolean,
      value: true
    }, // 是否开启过渡动画
    circling: {
      type: Boolean,
      value: false
    }, // 是否列表循环
    rotateDeg: {
      type: Number,
      value: 8
    }, // 整个滑动过程旋转角度
    showCards: {
      type: Number,
      value: 3
    }, // 显示几张卡片
    slideDuration: {
      type: Number,
      value: 200
    }, // 手指离开屏幕后滑出界面时长，单位(ms)毫秒
    slideThreshold: {
      type: Number,
      value: 80
    }, // 松手后滑出界面阈值，单位px
    upHeight: {
      type: Number,
      value: 20
    }, // 下层卡片下移高度，单位rpx
    scaleRatio: {
      type: Number,
      value: 0.03
    }, // 下层卡片收缩力度
    currentUser: {
      type: Object,
      value: {}
    } // 当前用户信息，用于点赞等操作
  },

  observers: {
    posts(newPosts, oldPosts) {
      if (!newPosts) return;
      this.cardReflect();
    },
    showCards(newCount, oldCount) {
      if (!newCount) return;
      this.cardReflect();
    }
  },

  data: {
    justShown: -1, // 控制滑出卡片重新渲染
    currentCursor: 0, // 当前最上层卡片索引
    currentZIndex: [], // 卡片层级数组
    sc: 3, // 实际显示卡片数量
    contextWidth: 0, // 组件宽度
  },

  attached() {
    // 给每张卡片设置层级
    const { posts } = this.data;
    if (posts && posts.length > 0) {
      this.setData({
        currentCursor: posts.findIndex(item => item)
      });
    }
    this.getContextWidth();
    this.cardReflect();
  },

  methods: {
    /**
     * 计算卡片反射和层级
     */
    cardReflect() {
      let { posts, showCards } = this.data;
      if (!posts || posts.length === 0) return;
      
      let sc = showCards;
      const validPosts = posts.filter(item => item);
      
      if (showCards < 1) sc = 1;
      else if (showCards > validPosts.length) sc = validPosts.length;
      
      this.setData({
        currentZIndex: new Array(sc).fill(0).map((_, index) => index + 1).reverse(),
        sc: sc
      });
    },

    /**
     * 获取组件宽度
     */
    getContextWidth() {
      const query = this.createSelectorQuery();
      query.select('.swipe-cards-wrapper').boundingClientRect();
      query.exec((res) => {
        if (res && res[0]) {
          const contextWidth = res[0].width;
          this.setData({
            contextWidth
          });
        }
      });
    },

    /**
     * 切换到下一张卡片
     */
    nextCard(e) {
      let { currentCursor, justShown, slideDuration } = this.data;
      justShown = currentCursor;
      currentCursor = this.countCurrentCursor(currentCursor);
      
      const eventDetail = {
        ...e,
        swipedPostIndex: justShown,
        currentCursor,
        swipedPost: this.data.posts[justShown]
      };
      
      setTimeout(() => {
        this.setData({
          justShown
        }, () => {
          this.setData({
            justShown: -1,
            currentCursor,
          });
        });
      }, 100);
      
      // 触发滑动事件
      this.triggerEvent('postSwipe', eventDetail);
    },

    /**
     * 计算下一个有效的卡片索引
     */
    countCurrentCursor(currentCursor) {
      const { circling, posts, removedPosts } = this.data;
      
      if (circling) {
        // 如果开启循环
        currentCursor = currentCursor + 1 === posts.length ? 0 : currentCursor + 1;
      } else {
        currentCursor += 1;
      }
      
      if (!removedPosts.includes(currentCursor)) return currentCursor;
      return this.countCurrentCursor(currentCursor);
    },

    /**
     * 点赞操作
     */
    onPostLike(e) {
      const { postId } = e.currentTarget.dataset;
      this.triggerEvent('postLike', { postId });
    },

    /**
     * 评论操作
     */
    onPostComment(e) {
      const { postId } = e.currentTarget.dataset;
      this.triggerEvent('postComment', { postId });
    },

    /**
     * 查看详情
     */
    onPostDetail(e) {
      const { post } = e.currentTarget.dataset;
      this.triggerEvent('postDetail', { post });
    },

    /**
     * 预览图片
     */
    onPreviewImage(e) {
      const { current, urls } = e.currentTarget.dataset;
      wx.previewImage({
        current,
        urls
      });
    }
  }
});
