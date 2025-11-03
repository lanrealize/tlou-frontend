/**
 * 分享动画智能播放助手
 * 
 * 规则：
 * 1. 首次进入某个圈 → 播放动画
 * 2. 7天以内再打开 → 不播放
 * 3. 间隔7天以上 → 再播放一次
 */

const STORAGE_KEY = 'shareAnimationHistory';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7天（毫秒）
// const SEVEN_DAYS_MS =20 * 1000; // 7天（毫秒）

/**
 * 判断是否应该播放分享动画
 * @param {string} circleId - 朋友圈ID
 * @returns {boolean} 是否应该播放
 */
export function shouldPlayShareAnimation(circleId) {
  if (!circleId) return false;
  
  try {
    const history = wx.getStorageSync(STORAGE_KEY) || {};
    const record = history[circleId];
    
    // 首次进入此圈
    if (!record || !record.lastPlayTime) {
      return true;
    }
    
    // 检查是否超过7天
    const now = Date.now();
    const daysSinceLastPlay = now - record.lastPlayTime;
    
    return daysSinceLastPlay >= SEVEN_DAYS_MS;
  } catch (error) {
    console.error('🎬 [shareAnimationHelper] 判断失败:', error);
    return true; // 出错时默认播放
  }
}

/**
 * 记录动画播放
 * @param {string} circleId - 朋友圈ID
 */
export function recordShareAnimationPlay(circleId) {
  if (!circleId) return;
  
  try {
    const history = wx.getStorageSync(STORAGE_KEY) || {};
    const now = Date.now();
    
    history[circleId] = {
      lastPlayTime: now,
      firstPlayTime: history[circleId]?.firstPlayTime || now
    };
    
    wx.setStorageSync(STORAGE_KEY, history);
    
    console.log('🎬 [shareAnimationHelper] 已记录播放:', {
      circleId,
      time: new Date(now).toLocaleString()
    });
  } catch (error) {
    console.error('🎬 [shareAnimationHelper] 记录失败:', error);
  }
}

/**
 * 清除某个圈的播放记录（调试用）
 * @param {string} circleId - 朋友圈ID
 */
export function clearShareAnimationRecord(circleId) {
  try {
    const history = wx.getStorageSync(STORAGE_KEY) || {};
    delete history[circleId];
    wx.setStorageSync(STORAGE_KEY, history);
    console.log('🎬 [shareAnimationHelper] 已清除记录:', circleId);
  } catch (error) {
    console.error('🎬 [shareAnimationHelper] 清除失败:', error);
  }
}

