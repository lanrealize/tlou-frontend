/**
 * quotaCache - 用户配额快照管理
 *
 * 唯一负责读写 Storage 中配额快照的模块。
 * 快照结构与后端 quota 字段保持一致：
 * {
 *   post:    { remaining: number, resetAt: string },
 *   comment: { remaining: number, resetAt: string }
 * }
 *
 * 用法：
 *   const quotaCache = require('./quotaCache');
 *   quotaCache.read()          // 读快照，无快照返回 null
 *   quotaCache.write(quota)    // 写快照（接收后端 quota 对象）
 */

const STORAGE_KEY = 'gk_quota_snapshot';

/**
 * 读取快照
 * @returns {{ post, comment } | null}
 */
function read() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || null;
  } catch(e) {
    return null;
  }
}

/**
 * 写入快照（覆盖式，以后端返回为准）
 * @param {Object} quota - 后端返回的 quota 对象
 *   可以是完整的 { post, comment }，也可以是局部的 { post } 或 { comment }
 *   局部更新时会与现有快照合并
 */
function write(quota) {
  if (!quota) return;
  try {
    const existing = read() || {};
    const merged = Object.assign({}, existing, quota);
    wx.setStorageSync(STORAGE_KEY, merged);
  } catch(e) {}
}

module.exports = { read, write };
