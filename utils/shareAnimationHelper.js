/**
 * 分享动画智能播放助手
 * 
 * 规则：
 * 1. 每次新分享都有独特的标识（circleId + shareTimestamp）
 * 2. 首次打开某个分享 → 播放动画
 * 3. 7天以内再打开同一个分享 → 不播放
 * 4. 间隔7天以上 → 再播放一次
 * 5. 不同的分享（即使同一个圈）→ 各自独立播放
 */

const STORAGE_KEY = 'shareAnimationHistory';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7天（毫秒）

/**
 * 判断是否应该播放分享动画
 * @param {string} circleId - 朋友圈ID
 * @param {string} shareTimestamp - 分享时间戳（标识每次独特的分享）
 * @returns {boolean} 是否应该播放
 */
export function shouldPlayShareAnimation(circleId, shareTimestamp) {
  if (!circleId || !shareTimestamp) return false;
  
  try {
    const history = wx.getStorageSync(STORAGE_KEY) || {};
    const shareKey = `${circleId}_${shareTimestamp}`;
    const record = history[shareKey];
    
    // 首次打开此分享
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
 * @param {string} shareTimestamp - 分享时间戳（标识每次独特的分享）
 */
export function recordShareAnimationPlay(circleId, shareTimestamp) {
  if (!circleId || !shareTimestamp) return;
  
  try {
    const history = wx.getStorageSync(STORAGE_KEY) || {};
    const now = Date.now();
    const shareKey = `${circleId}_${shareTimestamp}`;
    
    history[shareKey] = {
      lastPlayTime: now,
      firstPlayTime: history[shareKey]?.firstPlayTime || now,
      circleId,
      shareTimestamp
    };
    
    wx.setStorageSync(STORAGE_KEY, history);
  } catch (error) {
    console.error('🎬 [shareAnimationHelper] 记录失败:', error);
  }
}

/**
 * 清除某个圈的所有分享记录（调试用）
 * @param {string} circleId - 朋友圈ID
 */
export function clearShareAnimationRecord(circleId) {
  if (!circleId) return;
  
  try {
    const history = wx.getStorageSync(STORAGE_KEY) || {};
    
    // 清除该圈的所有分享记录
    Object.keys(history).forEach(key => {
      if (key.startsWith(`${circleId}_`)) {
        delete history[key];
      }
    });
    
    wx.setStorageSync(STORAGE_KEY, history);
  } catch (error) {
    console.error('🎬 [shareAnimationHelper] 清除失败:', error);
  }
}

