// utils/userStatus.js
// 统一的用户状态和访问控制管理

// ===== 1. 获取用户登录状态 =====
function getUserLoginStatus() {
  const app = getApp();
  const userStore = app.getUserStore();
  
  return {
    isLoggedIn: userStore.isLoggedIn,
    userInfo: userStore.userInfo
  };
}

// ===== 2. Action 规则配置 =====
const ACTION_RULES = {
  // 页面访问类
  enterListPage: {
    requireLogin: true,
    rejectMessage: '您需要登录才能查看朋友圈列表',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  enterSettingsPage: {
    requireLogin: true,
    rejectMessage: '您需要登录才能修改设置',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  enterPublishPage: {
    requireLogin: true,
    rejectMessage: '您需要登录才能发布动态',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  // 互动操作类
  likePost: {
    requireLogin: true,
    rejectMessage: '登录后才能点赞',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  commentPost: {
    requireLogin: true,
    rejectMessage: '登录后才能发表评论',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  shareCircle: {
    requireLogin: true,
    rejectMessage: '您需要登录才能分享朋友圈',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  // 朋友圈操作类
  acceptInvite: {
    requireLogin: true,
    rejectMessage: '请先完成注册后加入朋友圈',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: true,
    intentType: 'invited'
  },
  
  applyToJoin: {
    requireLogin: true,
    rejectMessage: '请先完成注册后提交申请',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: true,
    intentType: 'can_apply'
  },
  
  createCircle: {
    requireLogin: true,
    rejectMessage: '您需要登录才能创建朋友圈',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  }
};

// ===== 3. 核心访问控制函数 =====
function requireLogin(actionName, options = {}) {
  const { isLoggedIn } = getUserLoginStatus();
  const rule = ACTION_RULES[actionName];
  
  if (!rule) {
    console.error(`❌ 未定义的 action: ${actionName}`);
    return false;
  }
  
  // 如果不需要登录，直接通过
  if (!rule.requireLogin) {
    return true;
  }
  
  // 如果已登录，直接通过
  if (isLoggedIn) {
    return true;
  }
  
  // 未登录，执行拒绝逻辑
  handleLoginRequired(rule, options);
  return false;
}

// ===== 4. 处理登录要求 =====
function handleLoginRequired(rule, options = {}) {
  const { circleId, postId, customData } = options;
  
  // 保存意图（如果需要）
  if (rule.saveIntent) {
    saveUserIntent({
      type: rule.intentType,
      actionName: rule.intentType,
      circleId,
      postId,
      customData,
      message: rule.rejectMessage,
      timestamp: Date.now()
    });
  }
  
  // 构建跳转URL
  let url = rule.redirectTo;
  if (rule.saveIntent && circleId) {
    url += `?intent=${rule.intentType}&circleId=${circleId}&reason=${encodeURIComponent(rule.rejectMessage)}`;
  } else {
    url += `?reason=${encodeURIComponent(rule.rejectMessage)}`;
  }
  
  // 跳转到登录页
  wx.navigateTo({
    url,
    fail: () => {
      // 如果是 tabBar 页面，使用 switchTab
      wx.switchTab({ url: rule.redirectTo });
    }
  });
}

// ===== 5. 意图管理 =====
function saveUserIntent(intent) {
  const app = getApp();
  app.globalData.pendingIntent = intent;
  console.log('💾 保存用户意图:', intent);
}

function getUserIntent() {
  const app = getApp();
  return app.globalData.pendingIntent || null;
}

function clearUserIntent() {
  const app = getApp();
  app.globalData.pendingIntent = null;
  console.log('🗑️ 清除用户意图');
}

// ===== 6. Details 页面专用：获取用户与朋友圈的关系 =====
function getUserCircleRelation(circle, currentUser, isInviteMode = false) {
  // 第一层：是否登录
  if (!currentUser || !currentUser._id) {
    return {
      layer1: 'not_logged_in',
      layer2: null,
      status: 'not_logged_in',
      actionType: null,
      message: '登录后可以进行更多操作'
    };
  }
  
  const userId = currentUser._id;
  
  // 判断是否是成员
  const isOwner = checkIsOwner(circle, userId);
  const isMember = isOwner || checkIsMember(circle, userId);
  
  if (isMember) {
    return {
      layer1: 'logged_in',
      layer2: 'member',
      status: 'member',
      isOwner,
      actionType: 'publish',
      message: '发布新动态'
    };
  }
  
  // 第二层：已登录，非成员
  
  // 2a. 已申请（数据库状态）
  const hasApplied = checkHasApplied(circle, userId);
  if (hasApplied) {
    return {
      layer1: 'logged_in',
      layer2: 'applied',
      status: 'applied',
      isOwner: false,
      actionType: null,
      message: '申请已提交，等待审核'
    };
  }
  
  // 2c & 2d. 被邀请（前端判断：基于 URL 参数）
  if (isInviteMode) {
    return {
      layer1: 'logged_in',
      layer2: circle.isPublic ? 'invited_public' : 'invited_private',
      status: 'invited',
      isOwner: false,
      actionType: 'acceptInvite',
      message: '你已被邀请加入此朋友圈'
    };
  }
  
  // 2b. 可申请（前端判断：公开朋友圈）
  if (circle.isPublic) {
    return {
      layer1: 'logged_in',
      layer2: 'can_apply',
      status: 'can_apply',
      isOwner: false,
      actionType: 'applyToJoin',
      message: '这是一个公开朋友圈，可以申请加入'
    };
  }
  
  // 其他情况：无权访问
  return {
    layer1: 'logged_in',
    layer2: 'no_access',
    status: 'no_access',
    isOwner: false,
    actionType: null,
    message: '无权访问此朋友圈'
  };
}

// ===== 辅助函数 =====
function checkIsOwner(circle, userId) {
  if (!circle || !circle.creator || !userId) return false;
  const creatorId = typeof circle.creator === 'object' ? circle.creator._id : circle.creator;
  return creatorId === userId;
}

function checkIsMember(circle, userId) {
  if (!circle || !circle.members || !userId) return false;
  return circle.members.some(member => {
    const memberId = typeof member === 'object' ? member._id : member;
    return memberId === userId;
  });
}

function checkHasApplied(circle, userId) {
  if (!circle || !circle.appliers || !userId) return false;
  return circle.appliers.some(applier => {
    const applierId = typeof applier === 'object' ? applier._id : applier;
    return applierId === userId;
  });
}

// ===== 7. 检查成员资格（用于细粒度权限控制） =====
/**
 * 检查用户是否是朋友圈成员，如果不是则显示相应的提示
 * @param {Object} circle - 朋友圈对象
 * @param {Object} currentUser - 当前用户对象
 * @param {boolean} isInviteMode - 是否为邀请模式
 * @param {string} actionName - 操作名称（用于提示消息）
 * @returns {boolean} - 是否是成员
 */
function requireMembership(circle, currentUser, isInviteMode = false, actionName = '此操作') {
  // 第一层：检查是否登录
  const { isLoggedIn } = getUserLoginStatus();
  if (!isLoggedIn) {
    wx.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 2500
    });
    return false;
  }

  // 第二层：获取用户与朋友圈的关系
  const relation = getUserCircleRelation(circle, currentUser, isInviteMode);
  
  // 如果是成员，允许操作
  if (relation.status === 'member') {
    return true;
  }

  // 不是成员，根据状态显示不同的提示
  let message = '';
  
  switch (relation.status) {
    case 'invited':
      message = '请先点击底部按钮接受邀请';
      break;
    case 'can_apply':
      message = '请先点击底部按钮申请加入朋友圈';
      break;
    case 'applied':
      message = '您的申请正在审核中，请耐心等待';
      break;
    case 'not_logged_in':
      message = '请先登录';
      break;
    case 'no_access':
      message = '您无权访问此朋友圈';
      break;
    default:
      message = '请先加入朋友圈';
  }

  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2500
  });

  return false;
}

// ===== 8. 导出 =====
module.exports = {
  getUserLoginStatus,
  requireLogin,
  requireMembership,
  saveUserIntent,
  getUserIntent,
  clearUserIntent,
  getUserCircleRelation,
  ACTION_RULES  // 导出规则供查看
};

