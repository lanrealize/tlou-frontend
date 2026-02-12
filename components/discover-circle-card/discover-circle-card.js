// discover-circle-card 组件
Component({
  properties: {
    // 卡片模式：'discover' | 'history'
    mode: {
      type: String,
      value: 'discover'
    },
    // 卡片标题
    title: {
      type: String,
      value: '发现有趣朋友圈'
    },
    // 朋友圈数据
    circleData: {
      type: Object,
      value: {}
    },
    // 创建者头像
    creatorAvatar: {
      type: String,
      value: ''
    },
    // 动态内容
    content: {
      type: String,
      value: ''
    },
    // 是否有内容
    hasContent: {
      type: Boolean,
      value: false
    },
    // 动态图片
    postImage: {
      type: String,
      value: ''
    },
    // 最后更新时间（history模式使用）
    lastUpdateTime: {
      type: String,
      value: ''
    },
    // 成员列表（history模式使用）
    members: {
      type: Array,
      value: []
    },
    // 成员数量
    memberCount: {
      type: Number,
      value: 0
    },
    // 朋友圈ID
    circleId: {
      type: String,
      value: ''
    },
    // 是否有删除权限
    hasDeletePermission: {
      type: Boolean,
      value: false
    }
  },

  data: {
    showDropdown: false,  // 控制下拉菜单显示状态
    imageLoadStates: {}   // 图片加载状态管理
  },

  methods: {
    // ===== 🖼️ 图片加载状态管理方法 =====
    
    /**
     * 设置图片加载状态
     * @param {string} key - 图片标识符
     * @param {string} state - 状态: 'loading' | 'show' | 'error'
     */
    setImageLoadState(key, state) {
      this.setData({
        [`imageLoadStates.${key}`]: state
      });
    },
    
    // 创建者头像加载事件
    onCreatorAvatarLoad() {
      this.setImageLoadState('creator-avatar', 'show');
    },
    
    onCreatorAvatarError() {
      this.setImageLoadState('creator-avatar', 'error');
    },
    
    // 帖子图片加载事件
    onPostImageLoad() {
      this.setImageLoadState('post-image', 'show');
    },
    
    onPostImageError() {
      this.setImageLoadState('post-image', 'error');
    },
    
    // 卡片点击事件
    onCardTap() {
      // 如果下拉菜单正在显示，则只隐藏菜单，不触发其他逻辑
      if (this.data.showDropdown) {
        this.setData({
          showDropdown: false
        });
        return;
      }
      
      // 正常的卡片点击事件
      this.triggerEvent('cardTap', {
        circleId: this.data.circleId,
        circleData: this.data.circleData,
        mode: this.data.mode
      });
    },

    // 刷新按钮点击事件（仅discover模式）
    onRefreshTap() {
      if (this.data.mode === 'discover') {
        this.triggerEvent('refresh', {
          circleId: this.data.circleId,
          circleData: this.data.circleData
        });
      }
    },

    // 三点菜单点击事件
    onMoreMenuTap() {
      this.setData({
        showDropdown: !this.data.showDropdown
      });
    },

    // 删除按钮点击事件
    onDeleteTap() {
      // 隐藏下拉菜单
      this.setData({
        showDropdown: false
      });
      
      // 触发删除事件
      this.triggerEvent('delete', {
        circleId: this.data.circleId,
        circleData: this.data.circleData
      });
    },

    // 遮罩层点击事件 - 隐藏下拉菜单
    onMaskTap() {
      this.setData({
        showDropdown: false
      });
    }
  }
});
