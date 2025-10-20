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

// ===== 1.5 获取最新的用户信息（直接从store获取，避免MobX绑定延迟）=====
/**
 * 获取当前用户的最新信息
 * 
 * 🔑 关键说明：
 * - 直接从 userStore 获取，避免依赖 this.data 中可能延迟的 MobX 绑定
 * - 这是获取用户信息的标准方式，应优先使用此函数
 * 
 * @returns {Object|null} 当前用户信息，如果未登录则返回 null
 */
function getCurrentUser() {
  try {
    const app = getApp();
    const userStore = app?.getUserStore();
    
    // 如果用户已登录且有有效的用户信息（必须有_id），返回用户信息
    if (userStore && userStore.isLoggedIn && userStore.userInfo && userStore.userInfo._id) {
      return userStore.userInfo;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 获取当前用户信息失败:', error);
    return null;
  }
}

// ===== 2. Action 规则配置 =====
const ACTION_RULES = {
  // 页面访问类（只需要登录）
  enterListPage: {
    requireLogin: true,
    requireMembership: false,
    loginMessage: '您需要登录才能查看朋友圈列表',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  enterSettingsPage: {
    requireLogin: true,
    requireMembership: true,
    loginMessage: '您需要登录才能修改设置',
    membershipMessage: '只有朋友圈成员可以修改设置',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  enterPublishPage: {
    requireLogin: true,
    requireMembership: false,
    loginMessage: '您需要登录才能发布动态',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  // 互动操作类（需要登录 + 成员资格）
  likePost: {
    requireLogin: true,
    requireMembership: true,
    loginMessage: '登录后才能点赞',
    membershipMessage: '请先加入朋友圈才能点赞',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  commentPost: {
    requireLogin: true,
    requireMembership: true,
    loginMessage: '登录后才能发表评论',
    membershipMessage: '请先加入朋友圈才能评论',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  publishPost: {
    requireLogin: true,
    requireMembership: true,
    loginMessage: '您需要登录才能发布动态',
    membershipMessage: '请先加入朋友圈才能发布动态',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  shareCircle: {
    requireLogin: true,
    requireMembership: false,
    loginMessage: '您需要登录才能分享朋友圈',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  },
  
  // 朋友圈操作类（需要登录，不需要成员资格）
  acceptInvite: {
    requireLogin: true,
    requireMembership: false,
    loginMessage: '请先完成注册后加入朋友圈',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: true,
    intentType: 'invited'
  },
  
  applyToJoin: {
    requireLogin: true,
    requireMembership: false,
    loginMessage: '请先完成注册后提交申请',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: true,
    intentType: 'can_apply'
  },
  
  createCircle: {
    requireLogin: true,
    requireMembership: false,
    loginMessage: '您需要登录才能创建朋友圈',
    redirectTo: '/pages/userInfo/userInfo',
    saveIntent: false
  }
};

// ===== 3. 统一的权限检查函数 =====
/**
 * 检查用户对特定操作的访问权限（统一入口）
 * @param {string} actionName - 操作名称（在 ACTION_RULES 中定义）
 * @param {Object} options - 参数：{ circleId, postId, circle, currentUser, isInviteMode, customData }
 * @returns {boolean} - 是否允许访问（true=允许，false=拒绝）
 * 
 * 工作流程：
 * 1. 第一层：检查是否需要登录 (requireLogin)
 *    - 未登录 → redirect 到登录页 + 保存意图
 * 2. 第二层：检查是否需要成员资格 (requireMembership)
 *    - 非成员 → showToast 提示
 * 3. 两层都通过 → 允许操作
 */
function checkAccess(actionName, options = {}) {
  const rule = ACTION_RULES[actionName];
  
  if (!rule) {
    console.error(`❌ 未定义的 action: ${actionName}`);
    return false;
  }
  
  // ========== 第一层：检查登录 ==========
  if (rule.requireLogin) {
    const { isLoggedIn } = getUserLoginStatus();
    
    if (!isLoggedIn) {
      // 未登录：跳转到登录页
      handleLoginRequired(rule, options);
      return false;
    }
  }
  
  // ========== 第二层：检查成员资格 ==========
  if (rule.requireMembership) {
    const { circle, currentUser, isInviteMode } = options;
    
    // 验证必需参数
    if (!circle || !currentUser) {
      console.error(`❌ ${actionName} 需要 circle 和 currentUser 参数`);
      return false;
    }
    
    // 获取用户与朋友圈的关系
    const relation = getUserCircleRelation(circle, currentUser, isInviteMode || false);
    
    // 如果不是成员，显示相应提示
    if (relation.status !== 'member') {
      handleMembershipRequired(rule, relation);
      return false;
    }
  }
  
  // 所有检查都通过
  return true;
}

// ===== 4. 处理登录要求（未登录时） =====
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
      message: rule.loginMessage,
      timestamp: Date.now()
    });
  }
  
  // 构建跳转URL
  let url = rule.redirectTo;
  if (rule.saveIntent && circleId) {
    url += `?intent=${rule.intentType}&circleId=${circleId}&reason=${encodeURIComponent(rule.loginMessage)}`;
  } else {
    url += `?reason=${encodeURIComponent(rule.loginMessage)}`;
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

// ===== 5. 处理成员资格要求（非成员时） =====
function handleMembershipRequired(rule, relation) {
  // 根据用户与朋友圈的关系，显示不同的提示
  let message = rule.membershipMessage || '请先加入朋友圈';
  
  // 根据不同的状态，提供更具体的提示
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
    case 'no_access':
      message = '您无权访问此朋友圈';
      break;
    default:
      // 使用规则中配置的默认消息
      break;
  }
  
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2500
  });
}

// ===== 6. 意图管理 =====
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

// ===== 7. 获取用户与朋友圈的关系 =====
/**
 * 获取用户与朋友圈的关系
 * 
 * 🔑 核心改进：
 * - currentUser 参数现在是可选的
 * - 如果未传入或传入的数据不完整，函数会自动从 userStore 获取最新数据
 * - 这样可以避免 MobX 绑定延迟导致的状态判断错误
 * 
 * @param {Object} circle - 朋友圈对象
 * @param {Object} [currentUser] - 当前用户信息（可选，如果不传或不完整，会自动从store获取）
 * @param {boolean} [isInviteMode=false] - 是否为邀请模式
 * @returns {Object} 用户与朋友圈的关系对象
 */
function getUserCircleRelation(circle, currentUser, isInviteMode = false) {
  // 🔧 核心改进：自动获取最新的用户信息，避免依赖可能过期的数据
  // 如果传入的 currentUser 是空对象或没有 _id，说明可能是 MobX 绑定延迟，需要主动获取
  if (!currentUser || !currentUser._id) {
    console.log('⚠️ currentUser 参数无效，自动从 userStore 获取最新数据');
    currentUser = getCurrentUser();
  }
  
  // 🔑 未登录用户处理：根据朋友圈类型和访问方式，返回相应状态
  // 注意：需要后端提供公开 API 才能真正支持未登录用户查看
  if (!currentUser || !currentUser._id) {
    // 如果是邀请模式，显示"接受邀请"
    if (isInviteMode) {
      return {
        layer1: 'not_logged_in',
        layer2: 'invited',
        status: 'invited',
        isOwner: false,
        actionType: 'accept_invite',
        message: '接受邀请加入朋友圈'
      };
    }
    
    // 如果是公开朋友圈，显示"申请加入"
    if (circle && circle.isPublic) {
      return {
        layer1: 'not_logged_in',
        layer2: 'can_apply',
        status: 'can_apply',
        isOwner: false,
        actionType: 'apply',
        message: '申请加入这个朋友圈'
      };
    }
    
    // 私密朋友圈且非邀请模式，无权访问
    return {
      layer1: 'not_logged_in',
      layer2: 'no_access',
      status: 'no_access',
      isOwner: false,
      actionType: null,
      message: '无权访问此朋友圈'
    };
  }
  
  const userId = currentUser._id;
  
  // 判断是否是成员
  const isOwner = checkIsOwner(circle, userId);
  const isMember = isOwner || checkIsMember(circle, userId);
  
  // 🔧 关键防护：如果用户已经是成员，邀请模式应该被忽略
  // 这是最高优先级的判断，避免因为URL参数残留导致的状态错误
  if (isMember) {
    if (isInviteMode) {
      console.log('⚠️ 用户已是成员，但检测到邀请模式，自动忽略邀请模式');
    }
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

// ===== 8. 导出 =====
module.exports = {
  getUserLoginStatus,
  getCurrentUser,      // 🔧 新增：获取最新的用户信息（推荐使用）
  checkAccess,         // 统一的权限检查函数（登录 + 成员资格）
  saveUserIntent,
  getUserIntent,
  clearUserIntent,
  getUserCircleRelation,
  ACTION_RULES  // 导出规则供查看
};

