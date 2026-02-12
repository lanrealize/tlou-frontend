/**
 * 配额缓存管理工具
 * 用于管理"发现有趣朋友圈"功能的配额和数据缓存
 */

const STORAGE_KEY = 'discover_quota_cache';

/**
 * 获取配额缓存
 * @returns {Object|null} 缓存对象 { date, quota, circle } 或 null
 */
function getQuotaCache() {
  try {
    const cacheStr = wx.getStorageSync(STORAGE_KEY);
    console.log('🔍 [quotaCache.getQuotaCache] 读取缓存字符串:', cacheStr);
    
    if (!cacheStr) {
      console.log('🔍 [quotaCache.getQuotaCache] 缓存为空');
      return null;
    }
    
    const cache = JSON.parse(cacheStr);
    console.log('🔍 [quotaCache.getQuotaCache] 解析后的缓存:', cache);
    
    // 🔧 修改验证逻辑：只要有 quota 就是有效的，circle 可以为 null
    if (!cache || !cache.quota) {
      console.warn('⚠️ [quotaCache.getQuotaCache] 配额缓存结构无效（缺少quota），清空缓存');
      clearQuotaCache();
      return null;
    }
    
    return cache;
  } catch (error) {
    console.error('❌ [quotaCache.getQuotaCache] 读取配额缓存失败:', error);
    return null;
  }
}

/**
 * 更新配额缓存
 * @param {Object} data - 后端返回的数据 { quota, circle }
 */
function updateQuotaCache(data) {
  try {
    // 🔧 修改验证逻辑：只要有 quota 就可以保存，circle 可以为 null
    if (!data || !data.quota) {
      console.warn('⚠️ [quotaCache.updateQuotaCache] 无效的配额数据（缺少quota），不更新缓存');
      return;
    }
    
    const cache = {
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      quota: data.quota,
      circle: data.circle || null, // circle 可以为 null
      timestamp: Date.now()
    };
    
    wx.setStorageSync(STORAGE_KEY, JSON.stringify(cache));
    console.log('✅ [quotaCache.updateQuotaCache] 配额缓存已更新:', {
      remaining: cache.quota.remaining,
      daily: cache.quota.daily,
      circleId: cache.circle?._id || 'null'
    });
  } catch (error) {
    console.error('❌ [quotaCache.updateQuotaCache] 更新配额缓存失败:', error);
  }
}

/**
 * 清空配额缓存
 */
function clearQuotaCache() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
    console.log('🗑️ 配额缓存已清空');
  } catch (error) {
    console.error('❌ 清空配额缓存失败:', error);
  }
}

/**
 * 检查配额是否已过期（基于 resetAt 时间）
 * @param {Object} cache - 缓存对象
 * @returns {boolean} true=已过期，false=未过期
 */
function isQuotaExpired(cache) {
  console.log('🔍 [quotaCache.isQuotaExpired] 检查配额是否过期, cache:', cache);
  
  if (!cache || !cache.quota || !cache.quota.resetAt) {
    console.log('🔍 [quotaCache.isQuotaExpired] 缓存无效或无 resetAt，视为已过期');
    return true;
  }
  
  try {
    const resetTime = new Date(cache.quota.resetAt);
    const now = new Date();
    const isExpired = now >= resetTime;
    console.log('🔍 [quotaCache.isQuotaExpired] 时间对比:', {
      now: now.toISOString(),
      resetAt: resetTime.toISOString(),
      isExpired
    });
    return isExpired;
  } catch (error) {
    console.error('❌ [quotaCache.isQuotaExpired] 解析 resetAt 时间失败:', error);
    return true;
  }
}

/**
 * 检查是否有剩余配额
 * @param {Object} cache - 缓存对象
 * @returns {boolean} true=有剩余，false=已用完
 */
function hasRemainingQuota(cache) {
  console.log('🔍 [quotaCache.hasRemainingQuota] 检查剩余配额, cache:', cache);
  
  if (!cache || !cache.quota) {
    console.log('🔍 [quotaCache.hasRemainingQuota] 没有缓存，允许请求');
    return true; // 没有缓存，允许请求
  }
  
  // 如果已过期，视为有剩余配额
  if (isQuotaExpired(cache)) {
    console.log('🔍 [quotaCache.hasRemainingQuota] 配额已过期，允许请求');
    return true;
  }
  
  const hasRemaining = cache.quota.remaining > 0;
  console.log('🔍 [quotaCache.hasRemainingQuota] 剩余配额:', cache.quota.remaining, '结果:', hasRemaining);
  return hasRemaining;
}

/**
 * 获取配额提示文案
 * @param {Object} quota - 配额对象
 * @returns {string} 提示文案
 */
function getQuotaMessage(quota) {
  if (!quota) {
    return '今日次数已用完';
  }
  
  const { remaining, daily, isTemp, hasPurchase } = quota;
  
  if (remaining === 0) {
    if (isTemp) {
      return '今日次数已用完，登录后可获得更多次数';
    } else if (hasPurchase === false) {
      return '今日次数已用完';
    } else {
      return '今日次数已用完';
    }
  }
  
  return `今日剩余 ${remaining}/${daily} 次`;
}

module.exports = {
  getQuotaCache,
  updateQuotaCache,
  clearQuotaCache,
  isQuotaExpired,
  hasRemainingQuota,
  getQuotaMessage
};

