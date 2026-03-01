/**
 * 用户动作权限配置
 * 
 * 职责：定义所有状态下，各个动作的权限配置 + UI 配置
 * 
 * 配置结构（每个状态包含5个配置项）：
 * 
 * 1. permissions: 动作是否允许
 *    - true: 允许
 *    - false: 拒绝
 * 
 * 2. rejectMessages: 拒绝时的提示信息
 *    - 对象格式：{ actionName: 'message' }
 *    - 只配置需要提示的动作
 * 
 * 3. saveIntent: 需要保存意图的动作列表（资料完善后自动执行）
 *    - 数组格式：['acceptInvite', 'applyToJoin']
 *    - 意图类型即为动作名本身
 *    - 空数组 [] 表示无需保存意图
 * 
 * 4. rejectAction: 拒绝时的处理方式
 *    - 字符串格式：'showProfilePopup' | 'showToast'
 *    - 'showProfilePopup': 弹出资料完善框（资料未完善用户）
 *    - 'showToast': 显示 Toast（资料完整用户，默认）
 * 
 * 5. uiConfig: circle-status-action 组件的 UI 配置
 *    - show: 是否显示卡片
 *    - mainTitle: 主标题
 *    - subTitle: 副标题
 *    - button: 按钮配置
 *      - text: 按钮文字
 *      - action: 触发的事件名 ('publish' | 'acceptInvite' | 'apply')
 *      - type: 'button' (可点击) | 'static' (静态展示)
 *      - disabled: 是否禁用
 */

module.exports = {
  // ==================== 资料完整状态 ====================
  
  member: {
    permissions: {
      enterListPage: true,
      enterSettingsPage: true,
      enterPublishPage: true,
      likePost: true,
      commentPost: true,
      publishPost: true,
      acceptInvite: false,
      applyToJoin: false,
      createCircle: true
    },
    
    rejectMessages: {
      acceptInvite: '您已是成员',
      applyToJoin: '您已是成员'
    },
    
    saveIntent: [],
    rejectAction: 'showToast',
    
    uiConfig: {
      show: true,
      mainTitle: '发布新动态',
      subTitle: '分享你的精彩瞬间',
      button: {
        text: '发布',
        action: 'publish',
        type: 'static',
        disabled: false
      }
    }
  },
  
  applied: {
    permissions: {
      enterListPage: true,
      enterSettingsPage: false,
      enterPublishPage: true,
      likePost: false,
      commentPost: false,
      publishPost: false,
      acceptInvite: false,
      applyToJoin: false,
      createCircle: true
    },
    
    rejectMessages: {
      enterSettingsPage: '请等待审核通过',
      likePost: '请等待审核通过',
      commentPost: '请等待审核通过',
      publishPost: '请等待审核通过',
      acceptInvite: '您已申请，请等待审核',
      applyToJoin: '您已申请，请等待审核'
    },
    
    saveIntent: [],
    rejectAction: 'showToast',
    
    uiConfig: {
      show: true,
      mainTitle: '申请已提交',
      subTitle: '等待朋友圈主人审核中',
      button: {
        text: '审核中',
        action: null,
        type: 'static',
        disabled: true
      }
    }
  },
  
  invited_applied: {
    permissions: {
      enterListPage: true,
      enterSettingsPage: false,
      enterPublishPage: true,
      likePost: false,
      commentPost: false,
      publishPost: false,
      acceptInvite: true,
      applyToJoin: false,
      createCircle: true
    },
    
    rejectMessages: {
      enterSettingsPage: '请先接受邀请',
      likePost: '请先接受邀请',
      commentPost: '请先接受邀请',
      publishPost: '请先接受邀请',
      applyToJoin: '您已有邀请，可直接接受'
    },
    
    saveIntent: ['acceptInvite'],
    rejectAction: 'showToast',
    
    uiConfig: {
      show: true,
      mainTitle: '你收到了邀请',
      subTitle: '点击右侧按钮可直接加入（无需等待审核）',
      button: {
        text: '接受邀请',
        action: 'acceptInvite',
        type: 'button',
        disabled: false
      }
    }
  },
  
  invited: {
    permissions: {
      enterListPage: true,
      enterSettingsPage: false,
      enterPublishPage: true,
      likePost: false,
      commentPost: false,
      publishPost: false,
      acceptInvite: true,
      applyToJoin: false,
      createCircle: true
    },
    
    rejectMessages: {
      enterSettingsPage: '请先接受邀请',
      likePost: '请先接受邀请',
      commentPost: '请先接受邀请',
      publishPost: '请先接受邀请',
      applyToJoin: '您已有邀请，可直接接受'
    },
    
    saveIntent: ['acceptInvite'],
    rejectAction: 'showToast',
    
    uiConfig: {
      show: true,
      mainTitle: '你收到了邀请',
      subTitle: '点击右侧按钮加入这个朋友圈',
      button: {
        text: '接受邀请',
        action: 'acceptInvite',
        type: 'button',
        disabled: false
      }
    }
  },
  
  can_apply: {
    permissions: {
      enterListPage: true,
      enterSettingsPage: false,
      enterPublishPage: true,
      likePost: false,
      commentPost: false,
      publishPost: false,
      acceptInvite: false,
      applyToJoin: true,
      createCircle: true
    },
    
    rejectMessages: {
      enterSettingsPage: '请先申请加入',
      likePost: '请先申请加入',
      commentPost: '请先申请加入',
      publishPost: '请先申请加入',
      acceptInvite: '这不是邀请链接'
    },
    
    saveIntent: ['applyToJoin'],
    rejectAction: 'showToast',
    
    uiConfig: {
      show: true,
      mainTitle: '公开朋友圈',
      subTitle: '你可以申请加入这个朋友圈',
      button: {
        text: '申请加入',
        action: 'apply',
        type: 'button',
        disabled: false
      }
    }
  },
  
  no_access: {
    permissions: {
      enterListPage: true,
      enterSettingsPage: false,
      enterPublishPage: true,
      likePost: false,
      commentPost: false,
      publishPost: false,
      acceptInvite: false,
      applyToJoin: false,
      createCircle: true
    },
    
    rejectMessages: {
      enterSettingsPage: '无法访问',
      likePost: '请先申请加入',
      commentPost: '请先申请加入',
      publishPost: '请先申请加入',
      acceptInvite: '这不是邀请链接',
      applyToJoin: '这是私密朋友圈'
    },
    
    saveIntent: [],
    rejectAction: 'showToast',
    
    uiConfig: {
      show: true,
      mainTitle: '无法访问',
      subTitle: '无权查看此朋友圈',
      button: {
        text: '无权限',
        action: null,
        type: 'static',
        disabled: true
      }
    }
  },
  
  // ==================== 资料未完善状态 ====================
  
  guest_invited: {
    permissions: {
      enterListPage: false,
      enterSettingsPage: false,
      enterPublishPage: false,
      likePost: false,
      commentPost: false,
      publishPost: false,
      acceptInvite: false,
      applyToJoin: false,
      createCircle: false
    },
    
    rejectMessages: {
      enterListPage: '您需要完善资料才能查看朋友圈列表',
      enterSettingsPage: '您需要完善资料才能修改设置',
      enterPublishPage: '您需要完善资料才能发布动态',
      likePost: '完善资料后才能点赞',
      commentPost: '完善资料后才能发表评论',
      publishPost: '您需要完善资料才能发布动态',
      acceptInvite: '请先完善资料后加入朋友圈',
      applyToJoin: '请先完善资料后提交申请',
      createCircle: '您需要完善资料才能创建朋友圈'
    },
    
    saveIntent: ['acceptInvite'],
    rejectAction: 'showProfilePopup',
    
    uiConfig: {
      show: true,
      mainTitle: '你收到了邀请',
      subTitle: '点击右侧按钮加入这个朋友圈',
      button: {
        text: '接受邀请',
        action: 'acceptInvite',
        type: 'button',
        disabled: false
      }
    }
  },
  
  guest_can_apply: {
    permissions: {
      enterListPage: false,
      enterSettingsPage: false,
      enterPublishPage: false,
      likePost: false,
      commentPost: false,
      publishPost: false,
      acceptInvite: false,
      applyToJoin: false,
      createCircle: false
    },
    
    rejectMessages: {
      enterListPage: '您需要完善资料才能查看朋友圈列表',
      enterSettingsPage: '您需要完善资料才能修改设置',
      enterPublishPage: '您需要完善资料才能发布动态',
      likePost: '完善资料后才能点赞',
      commentPost: '完善资料后才能发表评论',
      publishPost: '您需要完善资料才能发布动态',
      acceptInvite: '这不是邀请链接',
      applyToJoin: '请先完善资料后提交申请',
      createCircle: '您需要完善资料才能创建朋友圈'
    },
    
    saveIntent: ['applyToJoin'],
    rejectAction: 'showProfilePopup',
    
    uiConfig: {
      show: true,
      mainTitle: '公开朋友圈',
      subTitle: '你可以申请加入这个朋友圈',
      button: {
        text: '申请加入',
        action: 'apply',
        type: 'button',
        disabled: false
      }
    }
  },
  
  guest_no_access: {
    permissions: {
      enterListPage: false,
      enterSettingsPage: false,
      enterPublishPage: false,
      likePost: false,
      commentPost: false,
      publishPost: false,
      acceptInvite: false,
      applyToJoin: false,
      createCircle: false
    },
    
    rejectMessages: {
      enterListPage: '您需要完善资料才能查看朋友圈列表',
      enterSettingsPage: '您需要完善资料才能修改设置',
      enterPublishPage: '您需要完善资料才能发布动态',
      likePost: '完善资料后才能点赞',
      commentPost: '完善资料后才能发表评论',
      publishPost: '您需要完善资料才能发布动态',
      acceptInvite: '这不是邀请链接',
      applyToJoin: '这是私密朋友圈',
      createCircle: '您需要完善资料才能创建朋友圈'
    },
    
    saveIntent: [],
    rejectAction: 'showProfilePopup',
    
    uiConfig: {
      show: false,  // 私密朋友圈资料未完善不显示组件
      mainTitle: '无法访问',
      subTitle: '无权查看此朋友圈',
      button: {
        text: '无权限',
        action: null,
        type: 'static',
        disabled: true
      }
    }
  }
};

