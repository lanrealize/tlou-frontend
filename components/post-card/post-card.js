// components/post-card/post-card.js
const util = require('../../utils/util');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    card: Object, // 帖子数据
    currentUser: Object, // 当前用户信息
    isLoggedIn: Boolean // 是否已登录
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 点赞/取消点赞
    onLike() {
      if (!this.data.isLoggedIn) {
        util.showToast('请先登录');
        return;
      }

      this.triggerEvent('like', {
        postId: this.data.card._id
      });
    },

    // 评论
    onComment() {
      if (!this.data.isLoggedIn) {
        util.showToast('请先登录');
        return;
      }

      this.triggerEvent('comment', {
        postId: this.data.card._id
      });
    },

    // 预览图片
    onPreviewImage(e) {
      const { current } = e.currentTarget.dataset;
      const urls = this.data.card.images.map(img => img.url || img);
      
      this.triggerEvent('previewImage', {
        current,
        urls
      });
    },

    // 点击用户头像
    onTapAvatar() {
      this.triggerEvent('tapAvatar', {
        user: this.data.card.author
      });
    },

    // 删除帖子
    onDelete() {
      this.triggerEvent('delete', {
        postId: this.data.card._id
      });
    }
  }
})
