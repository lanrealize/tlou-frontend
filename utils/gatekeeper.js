/**
 * Gatekeeper - 统一动作门控
 *
 * 只读 quotaCache，不写。写快照由业务层（publishPost/sendComment/refreshPosts）负责。
 * rate limit 不在前端检查，依赖后端 429 响应。
 *
 * 用法：
 *   const gatekeeper = require('../../utils/gatekeeper');
 *   if (!gatekeeper.check('publishPost', this)) return;
 */

const config = require('../config/gatekeeper');
const quotaCache = require('./quotaCache');

// ─── 配额门（只读 quotaCache） ─────────────────────────────

function checkQuota(resource) {
  const gate = config.gates.quota;
  if (!gate.enabled) return { allowed: true };

  const snapshot = quotaCache.read();
  if (!snapshot || !snapshot[resource]) return { allowed: true };

  const { remaining, resetAt } = snapshot[resource];

  if (resetAt && new Date() >= new Date(resetAt)) return { allowed: true };

  if (remaining <= 0) {
    return { allowed: false, reason: 'quota', popup: 'quota' };
  }

  return { allowed: true };
}

// ─── 资料完善门（基础设施，当前禁用） ─────────────────────

function checkProfileComplete() {
  const gate = config.gates.profileComplete;
  if (!gate.enabled) return { allowed: true };

  const { isProfileComplete } = require('./checkUserActionPermission');
  if (!isProfileComplete()) {
    return { allowed: false, reason: 'profileComplete', popup: gate.popup };
  }
  return { allowed: true };
}

// ─── 购买门（基础设施，当前禁用） ─────────────────────────

function checkPurchase() {
  const gate = config.gates.purchase;
  if (!gate.enabled) return { allowed: true };

  return { allowed: false, reason: 'purchase', popup: gate.popup };
}

// ─── 处理拒绝 ──────────────────────────────────────────────

function handleDenied(result, pageInstance) {
  if (result.popup === 'userInfo' && pageInstance) {
    pageInstance.setData({ userInfoPopupVisible: true });
  } else if (result.popup === 'quota' && pageInstance) {
    pageInstance.setData({ quotaPanelVisible: true });
  } else if (result.popup === 'purchase' && pageInstance) {
    pageInstance.setData({ purchasePopupVisible: true });
  } else if (result.message) {
    wx.showToast({ title: result.message, icon: 'none', duration: 2000 });
  }
}

// ─── 核心 API ──────────────────────────────────────────────

/**
 * 检查动作是否允许执行
 * @param {string} action - 见 config/gatekeeper.js actions
 * @param {Object} pageInstance - 页面/组件实例（弹窗用，可选）
 * @returns {boolean} true=允许，false=已拦截并自动处理
 */
function check(action, pageInstance) {
  const actionGates = config.actions[action];
  if (!actionGates) {
    console.warn(`[Gatekeeper] 未知动作: ${action}`);
    return true;
  }

  for (const gateStr of actionGates) {
    const [gateType, resource] = gateStr.split(':');

    let result;
    if (gateType === 'profileComplete') result = checkProfileComplete();
    else if (gateType === 'purchase')   result = checkPurchase();
    else if (gateType === 'quota')      result = checkQuota(resource);
    else continue;

    if (!result.allowed) {
      handleDenied(result, pageInstance);
      return false;
    }
  }

  return true;
}

module.exports = { check };
