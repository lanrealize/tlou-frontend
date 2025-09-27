// components/post-card/post-card.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    post: Object
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
    // 点赞
    onLike() {
      this.triggerEvent('like', {
        postId: this.data.post._id
      })
    },

    // 评论
    onComment() {
      this.triggerEvent('comment', {
        postId: this.data.post._id
      })
    },

    // 预览图片
    onPreviewImage(e) {
      const { current } = e.currentTarget.dataset
      const urls = this.data.post.images.map(img => img.url || img)
      this.triggerEvent('previewImage', {
        current,
        urls
      })
    },

    // 点击用户头像
    onTapAvatar() {
      this.triggerEvent('tapAvatar', {
        user: this.data.post.author
      })
    },

    // 更多操作
    onMore() {
      this.triggerEvent('more', {
        postId: this.data.post._id
      })
    }
  }
})
