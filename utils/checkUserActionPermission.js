/**
 * 用户动作权限管理
 * 
 * 职责：统一管理用户在朋友圈中的动作权限
 * 
 * 核心流程：
 * 1. 判断用户状态（getUserCircleStatus）
 * 2. 查询权限配置（STATE_CONFIGS）
 * 3. 检查权限并处理拒绝（checkActionPermission）
 */

const STATE_CONFIGS = require('../config/actionPermissions');

// ===== 辅助函数：检查成员资格 =====
function checkIsMember(circle, userId) {
  if (!circle || !userId) return false;
  return circle.members && circle.members.includes(userId);
}

function checkIsOwner(circle, userId) {
  if (!circle || !userId) return false;
  return circle.createdBy === userId;
}

function checkHasApplied(circle, userId) {
  if (!circle || !userId) return false;
  return circle.appliers && circle.appliers.includes(userId);
}

// ===== 辅助函数：获取当前用户登录状态 =====
function getUserLoginStatus() {
  const app = getApp();
  const userStore = app.getUserStore();
  
  return {
    isLoggedIn: !!userStore.userInfo && !!userStore.userInfo._id,
    userId: userStore.userInfo?._id || null,
    userInfo: userStore.userInfo
  };
}

/**
 * ========== 核心函数 1：获取用户状态 ==========
 * 
 * 判断用户在朋友圈中的状态（轻量，仅返回状态字符串）
 * 
 * @param {Object} circle - 朋友圈对象（必需）
 * @param {String} userId - 用户ID（可选，未登录为 null）
 * @param {Boolean} isInviteMode - 是否邀请模式（默认 false）
 * @returns {String} 状态字符串（9种之一）
 * 
 * 状态枚举（完整且互斥）：
 * 
 * 已登录（6种）：
 * - member: 成员
 * - applied: 已申请
 * - invited_applied: 既申请又被邀请
 * - invited: 被邀请
 * - can_apply: 可申请（公开朋友圈）
 * - no_access: 无权访问（私密朋友圈）
 * 
 * 未登录（3种）：
 * - guest_invited: 未登录+被邀请
 * - guest_can_apply: 未登录+公开
 * - guest_no_access: 未登录+私密
 * 
 * 判断逻辑（决策树，按优先级）：
 * 1. 未登录 → guest_invited / guest_can_apply / guest_no_access
 * 2. 已登录 + 成员 → member
 * 3. 已登录 + 非成员 + 被邀请 + 已申请 → invited_applied
 * 4. 已登录 + 非成员 + 被邀请 → invited
 * 5. 已登录 + 非成员 + 已申请 → applied
 * 6. 已登录 + 非成员 + 公开 → can_apply
 * 7. 已登录 + 非成员 + 私密 → no_access
 */
function getUserStatus(circle, userId = null, isInviteMode = false) {
  if (!circle) {
    console.error('❌ getUserStatus: circle 参数必需');
    return 'no_access';
  }
  
  // ===== 分支 1: 未登录 =====
  if (!userId) {
    if (isInviteMode) {
      return 'guest_invited';
    }
    
    if (circle.isPublic) {
      return 'guest_can_apply';
    }
    
    return 'guest_no_access';
  }
  
  // ===== 分支 2: 已登录 =====
  
  // 2.1 成员（包括主人）
  if (checkIsMember(circle, userId)) {
    return 'member';
  }
  
  // 2.2 非成员
  const hasApplied = checkHasApplied(circle, userId);
  
  // 优先级：被邀请 > 已申请（邀请更重要）
  if (isInviteMode && hasApplied) {
    return 'invited_applied';
  }
  
  if (isInviteMode) {
    return 'invited';
  }
  
  if (hasApplied) {
    return 'applied';
  }
  
  if (circle.isPublic) {
    return 'can_apply';
  }
  
  return 'no_access';
}

/**
 * ========== 核心函数 2：检查动作权限 ==========
 * 
 * @param {String} action - 动作名称（必需）
 * @param {Object} options - 选项
 * @param {Object} options.circle - 朋友圈对象（必需）
 * @param {String} options.userId - 用户ID（可选，未传则自动获取）
 * @param {Boolean} options.isInviteMode - 是否邀请模式（可选）
 * @param {String} options.circleId - 朋友圈ID（可选，用于保存意图）
 * @param {String} options.postId - 帖子ID（可选，用于保存意图）
 * @param {Object} options.customData - 自定义数据（可选，用于保存意图）
 * 
 * @returns {Object} 权限检查结果
 * {
 *   allowed: Boolean,        // 是否允许
 *   status: String,          // 用户状态
 *   message: String,         // 拒绝消息（allowed=false 时）
 *   shouldShowPopup: Boolean // 是否应该弹出注册框（allowed=false 时）
 * }
 * 
 * 使用示例：
 * 
 * // 示例1：简单检查
 * const result = checkActionPermission('likePost', { circle, userId });
 * if (result.allowed) {
 *   // 执行点赞
 * } else {
 *   // 已自动处理拒绝（弹框/Toast）
 * }
 * 
 * // 示例2：自动处理拒绝
 * if (!checkAndHandle('likePost', { circle })) {
 *   return; // 自动处理了拒绝情况
 * }
 * // 执行点赞
 */
function checkActionPermission(action, options = {}) {
  const { circle, isInviteMode = false, circleId, postId, customData } = options;
  
  // 验证必需参数
  if (!action) {
    console.error('❌ checkActionPermission: action 参数必需');
    return { allowed: false, status: null, message: '参数错误' };
  }
  
  if (!circle) {
    console.error('❌ checkActionPermission: circle 参数必需');
    return { allowed: false, status: null, message: '参数错误' };
  }
  
  // 获取用户ID（自动或手动）
  let userId = options.userId;
  if (userId === undefined) {
    const loginStatus = getUserLoginStatus();
    userId = loginStatus.userId;
  }
  
  // 1. 判断状态
  const status = getUserStatus(circle, userId, isInviteMode);
  
  // 2. 获取配置
  const config = STATE_CONFIGS[status];
  if (!config) {
    console.error(`❌ 未定义的状态: ${status}`);
    return { allowed: false, status, message: '状态错误' };
  }
  
  // 3. 获取权限
  const permission = config.permissions[action];
  
  // 3.1 权限检查
  if (permission === true) {
    return {
      allowed: true,
      status,
      message: null,
      rejectAction: null
    };
  }
  
  // 4. 权限拒绝 - 获取拒绝消息
  const message = config.rejectMessages[action] || '权限不足';
  
  // 5. 权限拒绝 - 获取拒绝处理方式
  // rejectAction 可以是字符串（统一处理）或对象（按动作区分）
  let rejectAction = 'showToast';  // 默认
  if (typeof config.rejectAction === 'string') {
    rejectAction = config.rejectAction;  // 统一处理方式
  } else if (config.rejectAction && config.rejectAction[action]) {
    rejectAction = config.rejectAction[action];  // 按动作区分
  }
  
  return {
    allowed: false,
    status,
    message,
    rejectAction,  // 'showRegisterPopup' | 'showToast'
    // 额外信息（用于保存意图）
    saveIntent: Array.isArray(config.saveIntent) && config.saveIntent.includes(action),
    intentAction: action,  // 意图类型就是动作名
    circleId,
    postId,
    customData
  };
}

/**
 * ========== 便捷函数：检查权限并自动处理拒绝 ==========
 * 
 * @param {String} action - 动作名称
 * @param {Object} options - 选项（同 checkActionPermission）
 * @returns {Boolean} 是否允许
 * 
 * 自动处理拒绝情况：
 * - 未登录 → 弹出注册框（如果配置了 showRegisterPopup）
 * - 已登录但无权限 → 显示 Toast 提示
 * - 自动保存意图（如果配置了 saveIntent）
 */
function checkAndHandle(action, options = {}) {
  const result = checkActionPermission(action, options);
  
  if (result.allowed) {
    return true;
  }
  
  // ===== 处理拒绝情况 =====
  
  // 1. 保存意图（如果需要）
  if (result.saveIntent) {
    const { saveUserIntent } = require('./userStatus');
    saveUserIntent({
      type: result.intentAction,
      actionName: result.intentAction,
      circleId: result.circleId,
      postId: result.postId,
      customData: result.customData,
      message: result.message,
      timestamp: Date.now()
    });
  }
  
  // 2. 根据 rejectAction 处理拒绝
  if (result.rejectAction === 'showRegisterPopup') {
    // 弹出注册框（未登录用户）
    const app = getApp();
    app.showUserInfoPopup({
      reason: result.message,
      intent: result.intentAction,
      circleId: result.circleId || '',
      saveIntent: result.saveIntent
    });
  } else {
    // 显示 Toast（默认，已登录但无权限）
    wx.showToast({
      title: result.message,
      icon: 'none',
      duration: 2000
    });
  }
  
  return false;
}

/**
 * ========== 获取用户状态及角色（完整信息）==========
 * 
 * 用途：主要用于 UI 状态显示
 * - 在 circle-status-action 组件中，需要根据 status 显示不同按钮
 * - 在页面中，需要根据 isOwner 显示管理按钮、设置入口等
 * 
 * 与 getUserStatus 的区别：
 * - getUserStatus: 只返回状态字符串（轻量，用于权限检查内部）
 * - getUserStatusWithRole: 返回 { status, isOwner }（完整，用于 UI 显示）
 * 
 * @param {Object} circle - 朋友圈对象
 * @param {String} userId - 用户ID（可选）
 * @param {Boolean} isInviteMode - 是否邀请模式
 * @returns {Object} { status, isOwner }
 * 
 * @example
 * // 组件中使用
 * const { status, isOwner } = getUserStatusWithRole(circle, userId, isInviteMode);
 * if (status === 'member') {
 *   // 显示"发布动态"按钮
 * }
 * if (isOwner) {
 *   // 显示"管理"按钮
 * }
 */
function getUserStatusWithRole(circle, userId = null, isInviteMode = false) {
  // 自动获取 userId
  if (userId === undefined || userId === null) {
    const loginStatus = getUserLoginStatus();
    userId = loginStatus.userId;
  }
  
  const status = getUserStatus(circle, userId, isInviteMode);
  const isOwner = userId ? checkIsOwner(circle, userId) : false;
  
  return { status, isOwner };
}

/**
 * ========== 获取 UI 配置 ==========
 * 
 * 用途：获取 circle-status-action 组件的 UI 配置
 * 
 * @param {Object} circle - 朋友圈对象
 * @param {String} userId - 用户ID（可选）
 * @param {Boolean} isInviteMode - 是否邀请模式
 * @returns {Object} UI 配置
 * {
 *   show: Boolean,          // 是否显示卡片
 *   mainTitle: String,      // 主标题
 *   subTitle: String,       // 副标题
 *   button: {
 *     text: String,         // 按钮文字
 *     action: String,       // 触发的事件名
 *     type: String,         // 'button' | 'static'
 *     disabled: Boolean     // 是否禁用
 *   }
 * }
 * 
 * @example
 * const uiConfig = getUIConfig(circle, userId, isInviteMode);
 * // 组件中直接使用配置
 * <view wx:if="{{uiConfig.show}}">
 *   <text>{{uiConfig.mainTitle}}</text>
 *   <text>{{uiConfig.subTitle}}</text>
 *   <button>{{uiConfig.button.text}}</button>
 * </view>
 */
function getUIConfig(circle, userId = null, isInviteMode = false) {
  const status = getUserStatus(circle, userId, isInviteMode);
  const config = STATE_CONFIGS[status];
  
  if (!config || !config.uiConfig) {
    console.error(`❌ 未定义的状态或 UI 配置: ${status}`);
    return {
      show: false,
      mainTitle: '',
      subTitle: '',
      button: { text: '', action: null, type: 'static', disabled: true }
    };
  }
  
  return config.uiConfig;
}

// ===== 导出 =====
module.exports = {
  // 核心函数
  getUserStatus,            // 获取用户状态（轻量）
  getUserStatusWithRole,    // 获取用户状态+角色（完整）
  getUIConfig,              // 获取 UI 配置
  checkActionPermission,    // 检查权限（返回详细结果）
  checkAndHandle,           // 检查权限并自动处理拒绝
  
  // 辅助函数
  checkIsMember,
  checkIsOwner,
  checkHasApplied,
  getUserLoginStatus
};

