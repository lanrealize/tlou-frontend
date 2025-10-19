// components/circle-status-action/circle-status-action.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前状态：not_logged_in | member | invited | applied | can_apply | no_access
    status: {
      type: String,
      value: 'not_logged_in'
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
    },

    // 去登录
    onLogin() {
      this.triggerEvent('login');
    }
  }
});

