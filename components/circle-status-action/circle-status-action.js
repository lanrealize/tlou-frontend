// components/circle-status-action/circle-status-action.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前状态：member | invited | applied | can_apply | no_access
    // 注意：已去掉 not_logged_in 状态（未注册用户也能看到操作按钮）
    status: {
      type: String,
      value: 'member'
    },
    // 朋友圈信息
    circle: {
      type: Object,
      value: null
    },
    // 是否正在申请中
    isApplying: {
      type: Boolean,
      value: false
    },
    // 是否正在加入中（接受邀请）
    isJoining: {
      type: Boolean,
      value: false
    },
    // 是否为朋友圈创建者
    isOwner: {
      type: Boolean,
      value: false
    },
    // 是否隐藏（用于与 user-info-popup 的联动动画）
    hidden: {
      type: Boolean,
      value: false
    }
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
    // 导航到发布页面
    onPublish() {
      this.triggerEvent('publish');
    },

    // 申请加入
    onApply() {
      this.triggerEvent('apply');
    },

    // 接受邀请
    onAcceptInvite() {
      this.triggerEvent('acceptInvite');
    }
  }
});

