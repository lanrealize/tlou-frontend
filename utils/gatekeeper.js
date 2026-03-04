/**
 * Gatekeeper - 统一动作门控
 *
 * 只读 quotaCache，不写。写快照由业务层（publishPost/sendComment/refreshPosts）负责。
 *
 * 用法：
 *   const gatekeeper = require('../../utils/gatekeeper');
 *   if (!gatekeeper.check('publishPost', this)) return;
 */

const config = require('../config/gatekeeper');
const quotaCache = require('./quotaCache');

// ─── 工具 ──────────────────────────────────────────────────

function thisMinute() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
}

function storageGet(key) {
  try { return wx.getStorageSync(key) || null; } catch(e) { return null; }
}

function storageSet(key, value) {
  try { wx.setStorageSync(key, value); } catch(e) {}
}

// ─── 配额门（只读 quotaCache） ─────────────────────────────

function checkQuota(resource) {
  const gate = config.gates.quota;
  if (!gate.enabled) return { allowed: true };

  const snapshot = quotaCache.read();
  if (!snapshot || !snapshot[resource]) return { allowed: true }; // 无快照，放行

  const { remaining, resetAt } = snapshot[resource];

  // 快照已过期（新的计费周期），放行
  if (resetAt && new Date() >= new Date(resetAt)) return { allowed: true };

  if (remaining <= 0) {
    const resetTime = resetAt ? new Date(resetAt) : null;
    const resetHint = resetTime
      ? `${resetTime.getHours().toString().padStart(2,'0')}:${resetTime.getMinutes().toString().padStart(2,'0')} 恢复`
      : '明天恢复';
    return {
      allowed: false,
      reason: 'quota',
      message: `今日${resource === 'post' ? '发帖' : '评论'}次数已用完，${resetHint}`,
    };
  }

  return { allowed: true };
}

// ─── 频率限制门 ────────────────────────────────────────────

const RATE_KEY_PREFIX = 'gk_rate';

function checkRateLimit(resource) {
  const gate = config.gates.rateLimit;
  if (!gate.enabled) return { allowed: true };

  const limit = gate.perMinute[resource];
  if (!limit) return { allowed: true };

  const key = `${RATE_KEY_PREFIX}_${resource}`;
  const record = storageGet(key);
  const minute = thisMinute();

  if (record && record.minute === minute && record.count >= limit) {
    return {
      allowed: false,
      reason: 'rateLimit',
      message: '操作太频繁了，稍等一下再试',
    };
  }

  // 通过后记录本次（rate limit 是纯本地防护，不依赖后端，在 check 时即消费）
  storageSet(key, {
    minute,
    count: (record && record.minute === minute ? record.count : 0) + 1,
  });

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

  // TODO: 接入购买状态检查
  return { allowed: false, reason: 'purchase', popup: gate.popup };
}

// ─── 处理拒绝 ──────────────────────────────────────────────

function handleDenied(result, pageInstance) {
  if (result.popup === 'userInfo' && pageInstance) {
    pageInstance.setData({ userInfoPopupVisible: true });
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
    else if (gateType === 'rateLimit')  result = checkRateLimit(resource);
    else continue;

    if (!result.allowed) {
      handleDenied(result, pageInstance);
      return false;
    }
  }

  return true;
}

module.exports = { check };
