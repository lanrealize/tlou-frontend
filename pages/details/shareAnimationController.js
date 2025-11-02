// pages/details/shareAnimationController.js

/**
 * 🎬 分享入场动画配置
 * 
 * 时间线说明：
 * T=0ms     : 黑屏容器显示
 * T=500ms   : 图片和渐变同时添加 active（CSS 内部各自有 delay）
 * T=3000ms  : 图片淡入结束
 * T=3500ms  : 标记动画完成
 * T=4200ms  : 渐变滑动结束
 * T=5500ms  : 移除动画容器
 */
const SHARE_ANIMATION_CONFIG = {
  // ===== 时间点配置（所有时间点都基于 T=0） =====
  timeline: {
    CONTAINER_SHOW: 0,          // 黑屏容器显示（onLoad 时已设置）
    ADD_ACTIVE_CLASS: 500,      // 添加 active class（触发 CSS 动画）
    IMAGE_END: 3000,            // 图片淡入结束 (500 + 2500)
    MARK_COMPLETED: 3500,       // 标记动画完成（可以开始显示内容）
    GRADIENT_END: 4200,         // 渐变滑动结束 (1700 + 2500)
    REMOVE_CONTAINER: 5500      // 移除动画容器（增加1秒缓冲）
  },

  // ===== CSS 动画配置（与 details.wxss 保持一致） =====
  css: {
    // 图片动画
    IMAGE_DURATION: '2.5s',     // 图片淡入持续时间
    IMAGE_DELAY: '0s',          // 图片无CSS延迟（由JS控制500ms添加active）
    IMAGE_EASING: 'ease-out',   // 图片缓动函数

    // 渐变动画
    GRADIENT_DURATION: '2.5s',                      // 渐变滑动持续时间
    GRADIENT_DELAY: '1.2s',                         // 渐变CSS延迟（实际开始时间 = 500 + 1200 = 1700ms）
    GRADIENT_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)' // ✨ Material Design 标准缓动
  },

  // ===== Observable 等待配置 =====
  dataWait: {
    TIMEOUT: 2000               // Observable 等待超时时间（ms）
  }
};

/**
 * 🎬 分享入场动画控制器
 * 
 * 职责：
 * 1. 管理动画时间线和状态
 * 2. 统一管理和清理所有定时器
 * 3. 提供启动、取消动画的接口
 * 4. 防止内存泄漏
 * 
 * 使用示例：
 * ```javascript
 * // 在 Page.onLoad 中创建
 * this.animationController = new ShareAnimationController(this);
 * 
 * // 启动动画
 * this.animationController.start(imageUrl);
 * 
 * // 取消动画（如果需要）
 * this.animationController.cancel();
 * 
 * // 在 Page.onUnload 中清理
 * this.animationController?.destroy();
 * ```
 */
class ShareAnimationController {
  /**
   * 构造函数
   * @param {Object} page - 页面实例（this）
   */
  constructor(page) {
    this.page = page;
    this.timers = [];
    this.config = SHARE_ANIMATION_CONFIG;
    this.isPlaying = false;
    
    console.log('🎬 ShareAnimationController 已创建');
    console.log('📋 动画配置:', this.config);
  }

  /**
   * 添加定时器（统一管理，方便清理）
   * @param {Function} callback - 回调函数
   * @param {number} delay - 延迟时间（ms）
   * @returns {number} 定时器ID
   */
  addTimer(callback, delay) {
    const timer = setTimeout(() => {
      callback();
      // 执行完后从数组中移除
      this.timers = this.timers.filter(t => t !== timer);
    }, delay);
    
    this.timers.push(timer);
    console.log(`⏱️ 添加定时器 #${timer}，延迟 ${delay}ms，当前活跃定时器数: ${this.timers.length}`);
    
    return timer;
  }

  /**
   * 清理所有定时器
   */
  clearAllTimers() {
    const count = this.timers.length;
    if (count > 0) {
      console.log(`🧹 清理 ${count} 个定时器`);
      this.timers.forEach(timer => {
        clearTimeout(timer);
        console.log(`  ✓ 清理定时器 #${timer}`);
      });
      this.timers = [];
    }
  }

  /**
   * 启动动画
   * @param {string} imageUrl - 图片URL
   */
  start(imageUrl) {
    if (this.isPlaying) {
      console.warn('⚠️ 动画已在播放中，忽略重复启动');
      return;
    }

    console.log('🎬 ========== 启动分享动画 ==========');
    console.log('📷 图片URL:', imageUrl);
    console.log('📅 时间线:', this.config.timeline);

    this.isPlaying = true;
    const { timeline } = this.config;

    // ===== T=0ms: 容器已显示（onLoad 时设置） =====
    this.page.setData({
      shareAnimationState: 'playing',
      shareAnimationImageUrl: imageUrl
    });

    // ===== T=500ms: 添加 active class =====
    this.addTimer(() => {
      console.log('✨ [T=500ms] 添加 active class（触发图片和渐变动画）');
      this.page.setData({
        shareAnimationClass: 'active',
        shareGradientClass: 'active'  // 同时添加（CSS内部gradient有1.2s delay）
      });
    }, timeline.ADD_ACTIVE_CLASS);

    // ===== T=3000ms: 图片淡入结束 =====
    this.addTimer(() => {
      console.log('🖼️ [T=3000ms] 图片淡入动画结束');
    }, timeline.IMAGE_END);

    // ===== T=3500ms: 标记动画完成 =====
    this.addTimer(() => {
      console.log('🎉 [T=3500ms] 标记动画完成，开始显示页面内容');
      this.page.setData({
        shareAnimationState: 'completed',
        shareAnimationCompleted: true
      });
    }, timeline.MARK_COMPLETED);

    // ===== T=4200ms: 渐变滑动结束 =====
    this.addTimer(() => {
      console.log('🎨 [T=4200ms] 渐变滑动动画结束');
    }, timeline.GRADIENT_END);

    // ===== T=5500ms: 移除动画容器 =====
    this.addTimer(() => {
      console.log('🧹 [T=5500ms] 移除动画容器');
      this.page.setData({
        showShareAnimation: false,
        shareAnimationImageUrl: '',
        shareAnimationClass: '',
        shareGradientClass: ''
      });
      
      this.isPlaying = false;
      this.clearAllTimers();
      
      console.log('✅ ========== 动画完成 ==========');
    }, timeline.REMOVE_CONTAINER);
  }

  /**
   * 取消动画
   */
  cancel() {
    if (!this.isPlaying) {
      console.log('ℹ️ 动画未播放，无需取消');
      return;
    }

    console.log('❌ 取消分享动画');
    
    this.clearAllTimers();
    this.isPlaying = false;

    // 立即重置所有状态
    this.page.setData({
      showShareAnimation: false,
      shareAnimationImageUrl: '',
      shareAnimationClass: '',
      shareGradientClass: '',
      shareAnimationState: 'idle',
      shareAnimationCompleted: false
    });

    console.log('✅ 动画已取消');
  }

  /**
   * 销毁控制器（页面卸载时调用）
   */
  destroy() {
    console.log('💥 销毁 ShareAnimationController');
    this.cancel();
    this.page = null;
    this.config = null;
  }

  /**
   * 获取配置（供外部读取）
   */
  getConfig() {
    return { ...this.config };
  }
}

// 导出
module.exports = {
  ShareAnimationController,
  SHARE_ANIMATION_CONFIG
};

