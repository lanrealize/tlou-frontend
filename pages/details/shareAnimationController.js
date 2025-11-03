// pages/details/shareAnimationController.js

/**
 * 🎛️ 动画调参区 - 修改这里即可调整整个动画节奏
 * ===================================================
 * 💡 使用指南：
 * 1. 修改下面的参数值
 * 2. 保存文件
 * 3. 刷新小程序查看效果
 * 4. 不满意继续调整，直到满意为止
 */
const ANIMATION_TUNING = {
  // ===== 阶段1：开场动画 =====
  OPENING_DELAY: 500,              // 开场前等待（让容器渲染）
  OPENING_DURATION: 2500,          // 图片淡入时长
  
  // ===== 阶段2：欣赏阶段 =====
  APPRECIATION_DURATION: 2000,     // 全屏欣赏时长
  
  // ===== 阶段3：过渡动画 =====
  IMAGE_TRANSITION_DURATION: 2000, // 图片缩小移动时长
  
  // 🎯 关键参数：内容淡入时机
  // ⚡ 修改这个值来调整内容淡入时机：
  //    0    = 图片到达后立即开始淡入（无缝衔接）
  //    100  = 图片到达后延迟100ms开始淡入
  //    500  = 图片到达后延迟500ms开始淡入 ✅ 更从容
  //    -500 = 图片到达前500ms开始淡入（重叠）
  CONTENT_FADEIN_DELAY: 500,       // ✅ 图片到达后停顿0.5秒，更从容
  
  CONTENT_FADEIN_DURATION: 800,   // ⚠️ 必须和CSS中的transition时间一致！(details.wxss中是800ms)
  
  // ===== 清理阶段 =====
  CONTAINER_REMOVE_DELAY: 50       // 动画完成后延迟移除容器
};

/**
 * 📊 自动计算的时间线
 * ⚠️ 不要手动修改这里！修改上面的 ANIMATION_TUNING 即可
 */
const CALCULATED_TIMELINE = (() => {
  const T_START = 0;
  const T_OPENING_START = T_START + ANIMATION_TUNING.OPENING_DELAY;
  const T_OPENING_END = T_OPENING_START + ANIMATION_TUNING.OPENING_DURATION;
  const T_TRANSITION_START = T_OPENING_END + ANIMATION_TUNING.APPRECIATION_DURATION;
  const T_IMAGE_ARRIVED = T_TRANSITION_START + ANIMATION_TUNING.IMAGE_TRANSITION_DURATION;
  const T_MASK_FADEOUT = T_IMAGE_ARRIVED + ANIMATION_TUNING.CONTENT_FADEIN_DELAY;
  const T_TRANSITION_END = T_MASK_FADEOUT + ANIMATION_TUNING.CONTENT_FADEIN_DURATION;
  const T_REMOVE = T_TRANSITION_END + ANIMATION_TUNING.CONTAINER_REMOVE_DELAY;
  
  return {
    CONTAINER_SHOW: T_START,
    ADD_ACTIVE_CLASS: T_OPENING_START,
    OPENING_END: T_OPENING_END,
    START_TRANSITION: T_TRANSITION_START,
    IMAGE_ARRIVED: T_IMAGE_ARRIVED,
    START_MASK_FADEOUT: T_MASK_FADEOUT,
    TRANSITION_END: T_TRANSITION_END,
    REMOVE_CONTAINER: T_REMOVE,
    
    // 📝 时间线摘要（便于查看）
    _summary: {
      total_duration: T_REMOVE,
      opening_phase: `0ms - ${T_OPENING_END}ms (${T_OPENING_END}ms)`,
      appreciation_phase: `${T_OPENING_END}ms - ${T_TRANSITION_START}ms (${ANIMATION_TUNING.APPRECIATION_DURATION}ms)`,
      transition_phase: `${T_TRANSITION_START}ms - ${T_TRANSITION_END}ms (${T_TRANSITION_END - T_TRANSITION_START}ms)`,
      overlap: ANIMATION_TUNING.CONTENT_FADEIN_DELAY < 0 ? 
        `图片和内容重叠 ${-ANIMATION_TUNING.CONTENT_FADEIN_DELAY}ms` : 
        ANIMATION_TUNING.CONTENT_FADEIN_DELAY === 0 ?
        '图片和内容无缝衔接' :
        `图片到达后延迟 ${ANIMATION_TUNING.CONTENT_FADEIN_DELAY}ms 开始淡入`
    }
  };
})();

/**
 * 🎬 分享入场动画配置
 */
const SHARE_ANIMATION_CONFIG = {
  // ===== 时间点配置（自动计算） =====
  timeline: CALCULATED_TIMELINE,

  // ===== CSS 动画配置（与 details.wxss 保持一致） =====
  css: {
    // 开场动画 - 图片
    OPENING_IMAGE_DURATION: '2.5s',
    OPENING_IMAGE_DELAY: '0s',
    OPENING_IMAGE_EASING: 'ease-out',

    // 开场动画 - 渐变
    OPENING_GRADIENT_DURATION: '2.5s',
    OPENING_GRADIENT_DELAY: '1.2s',
    OPENING_GRADIENT_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // 过渡动画
    TRANSITION_DURATION: '2000ms',                          // 过渡持续时间
    TRANSITION_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',      // 过渡缓动函数
    CONTENT_FADEIN_DURATION: '2000ms',                      // 内容淡入持续时间
    CONTENT_FADEIN_EASING: 'linear'                         // 内容淡入缓动函数
  },

  // ===== Observable 等待配置 =====
  dataWait: {
    TIMEOUT: 2000               // Observable 等待超时时间（ms）
  },
  
  // ===== 布局配置（post-item布局规则） =====
  layout: {
    // 单张图片尺寸（rpx）
    PORTRAIT_HEIGHT: 460,       // 纵向图片固定高度
    PORTRAIT_MAX_WIDTH: 500,    // 纵向图片最大宽度
    LANDSCAPE_WIDTH: 500,       // 横向图片固定宽度
    LANDSCAPE_MAX_HEIGHT: 460,  // 横向图片最大高度
    
    // 网格图片尺寸（rpx）
    GRID_2_SIZE: 242,           // 2张图片时的正方形尺寸: (500-16)/2
    GRID_3PLUS_SIZE: 156,       // 3+张图片时的正方形尺寸: (500-32)/3
    GRID_GAP: 16,               // 网格间距
    
    // post-item 布局参数（rpx）
    // ⚠️ 注意：这些参数对所有图片模式（纵向/横向/网格）都通用！
    //          只要 post-item 的DOM结构不变，这些值就是固定的
    AVATAR_WIDTH: 76,           // 头像宽度
    FLEX_GAP: 20,               // flex gap
    USER_INFO_HEIGHT: 199,      // 🔧 校准后：用户信息区域高度（username + 所有间距）
    IMAGE_MARGIN_TOP: 20,       // 图片顶部间距（无文字时）
    POST_ITEM_MARGIN: 55        // 🔧 校准后：post-item 左边距（实际测量倒推）
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
    this.cachedRealRect = null;  // 缓存真实测量的图片位置
    this.cachedTargetInfo = null; // 缓存计算的目标位置
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
    return timer;
  }

  /**
   * 清理所有定时器
   */
  clearAllTimers() {
    const count = this.timers.length;
    if (count > 0) {
      this.timers.forEach(timer => {
        clearTimeout(timer);
      });
      this.timers = [];
    }
  }

  /**
   * 🎯 设置图片尺寸（从bindload事件获取）
   * @param {number} width - 图片宽度（可能是显示尺寸或原始尺寸）
   * @param {number} height - 图片高度（可能是显示尺寸或原始尺寸）
   */
  setImageSize(width, height) {
    // 获取第一个帖子的图片数量
    const firstPost = this.page.data.posts?.[0];
    if (!firstPost || !firstPost.images) {
      return;
    }
    
    const imageCount = firstPost.images.length;
    
    // 尝试从post数据中获取原始尺寸（更准确）
    const firstImage = firstPost.images[0];
    let actualWidth = width;
    let actualHeight = height;
    
    // 方式1：从图片对象本身获取
    if (typeof firstImage === 'object' && firstImage.width && firstImage.height) {
      actualWidth = firstImage.width;
      actualHeight = firstImage.height;
    }
    // 方式2：从imageMeta获取
    else if (firstPost.imageMeta && firstPost.imageMeta[0]) {
      const meta = firstPost.imageMeta[0];
      if (meta.width && meta.height) {
        actualWidth = meta.width;
        actualHeight = meta.height;
      }
    }
    
    this.imageWidth = actualWidth;
    this.imageHeight = actualHeight;
    
    // 立即计算目标位置和尺寸
    const targetInfo = this.calculateTargetImageInfo(actualWidth, actualHeight, imageCount);
    this.cachedTargetInfo = targetInfo;
  }

  /**
   * 📐 计算图片在post-item中的目标位置和尺寸（纯计算，无DOM查询）
   * @param {number} imageWidth - 图片原始宽度（px）
   * @param {number} imageHeight - 图片原始高度（px）
   * @param {number} imageCount - 帖子的图片总数
   * @returns {Object} 目标信息 { mode, targetWidth, targetHeight, targetLeft, targetTop, transform }
   */
  calculateTargetImageInfo(imageWidth, imageHeight, imageCount) {
    const systemInfo = wx.getSystemInfoSync();
    const windowWidth = systemInfo.windowWidth;
    const windowHeight = systemInfo.windowHeight;
    
    // rpx 转 px
    const rpx2px = (rpx) => (windowWidth / 750) * rpx;
    
    const layout = this.config.layout;
    
    // 第1步：确定图片模式和目标尺寸（rpx）
    let mode, targetWidthRpx, targetHeightRpx;
    
    if (imageCount === 1) {
      // 单张图片：根据宽高比判断横向/纵向
      const isPortrait = imageHeight > imageWidth;
      
      if (isPortrait) {
        mode = 'portrait';
        targetHeightRpx = layout.PORTRAIT_HEIGHT;
        targetWidthRpx = targetHeightRpx * (imageWidth / imageHeight);  // ✨ 保留小数
        
        // 限制最大宽度
        if (targetWidthRpx > layout.PORTRAIT_MAX_WIDTH) {
          targetWidthRpx = layout.PORTRAIT_MAX_WIDTH;
          targetHeightRpx = targetWidthRpx * (imageHeight / imageWidth);  // ✨ 保留小数
        }
      } else {
        mode = 'landscape';
        targetWidthRpx = layout.LANDSCAPE_WIDTH;
        targetHeightRpx = targetWidthRpx * (imageHeight / imageWidth);  // ✨ 保留小数
        
        // 限制最大高度
        if (targetHeightRpx > layout.LANDSCAPE_MAX_HEIGHT) {
          targetHeightRpx = layout.LANDSCAPE_MAX_HEIGHT;
          targetWidthRpx = targetHeightRpx * (imageWidth / imageHeight);  // ✨ 保留小数
        }
      }
    } else if (imageCount === 2) {
      mode = '2-grid';
      targetWidthRpx = targetHeightRpx = layout.GRID_2_SIZE;
    } else {
      mode = '3-plus-grid';
      targetWidthRpx = targetHeightRpx = layout.GRID_3PLUS_SIZE;
    }
    
    // 第2步：计算目标位置（px）
    const targetWidth = rpx2px(targetWidthRpx);
    const targetHeight = rpx2px(targetHeightRpx);
    
    const targetLeft = rpx2px(layout.POST_ITEM_MARGIN) + 
                       rpx2px(layout.AVATAR_WIDTH) + 
                       rpx2px(layout.FLEX_GAP);
    
    const navigationHeight = this.page.data.navigationData?.totalNavigationHeight || 0;
    const postItemTopMargin = rpx2px(20);
    const targetTop = navigationHeight + 
                      postItemTopMargin + 
                      rpx2px(layout.USER_INFO_HEIGHT) + 
                      rpx2px(layout.IMAGE_MARGIN_TOP);
    
    // 第3步：计算transform
    const scale = targetWidth / windowWidth;
    
    const imageCenterX = targetLeft + targetWidth / 2;
    const imageCenterY = targetTop + targetHeight / 2;
    const screenCenterX = windowWidth / 2;
    const screenCenterY = windowHeight / 2;
    
    const offsetX = imageCenterX - screenCenterX;
    const offsetY = imageCenterY - screenCenterY;
    
    const translateX = offsetX / scale;
    const translateY = offsetY / scale;
    
    const transform = `scale(${scale.toFixed(4)}) translate(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px)`;
    
    return {
      mode,
      targetWidth,
      targetHeight,
      targetLeft,
      targetTop,
      transform,
      scale,
      translateX,
      translateY,
      targetStyle: `width: ${targetWidth}px; height: ${targetHeight}px; left: ${targetLeft}px; top: ${targetTop}px;`
    };
  }

  /**
   * 🎯 测量第一个post-item的真实图片位置（DOM实测方案）
   * @returns {Promise<Object>} 真实的图片位置 { left, top, width, height } 或 null（失败时）
   */
  measureRealImagePosition() {
    return new Promise((resolve) => {
      const firstPostComponent = this.page.selectComponent('#first-post-item');
      
      if (!firstPostComponent) {
        resolve(null);
        return;
      }
      
      firstPostComponent.getImageRect()
        .then((rect) => {
          resolve(rect);
        })
        .catch(() => {
          resolve(null);
        });
    });
  }

  /**
   * 启动动画 - 完整三步流程
   * @param {string} imageUrl - 图片URL
   */
  start(imageUrl) {
    if (this.isPlaying) return;

    this.isPlaying = true;
    const { timeline } = this.config;

    // ===== T=0ms: 容器显示（onLoad 时已设置） =====
    this.page.setData({
      shareAnimationState: 'playing',
      shareAnimationImageUrl: imageUrl
    });
    
    // 🎨 立即将导航栏和胶囊按钮设置为白色（适配全屏黑色背景）
    wx.setNavigationBarColor({
      frontColor: '#ffffff',  // 胶囊按钮、标题、状态栏文字变白色
      backgroundColor: '#000000',  // 导航栏背景色（透明时不影响）
      animation: {
        duration: 0,  // 立即生效
        timingFunc: 'linear'
      }
    });

    // ===== 阶段1：开场动画（T=0 ~ T=3000） =====
    
    // T=500ms: 添加 active class（触发开场动画）
    this.addTimer(() => {
      this.page.setData({
        shareAnimationClass: 'active',
        shareGradientClass: 'active'
      });
    }, timeline.ADD_ACTIVE_CLASS);

    // T=3500ms: 在欣赏期测量真实图片位置
    this.addTimer(() => {
      this.measureRealImagePosition().then((rect) => {
        if (rect) {
          this.cachedRealRect = rect;
        }
      });
    }, 3500);

    // ===== 阶段3：过渡动画（T=5000 ~ T=6200） =====
    
    // T=5000ms: 开始过渡
    this.addTimer(() => {
      // 优先使用真实测量值，降级使用计算值
      let targetStyle;
      
      if (this.cachedRealRect) {
        // 使用 DOM 实测值
        const rect = this.cachedRealRect;
        const targetLeft = rect.left;
        const targetTop = rect.top;
        const targetWidth = rect.width;
        const targetHeight = rect.height;
        targetStyle = `width: ${targetWidth}px; height: ${targetHeight}px; left: ${targetLeft}px; top: ${targetTop}px;`;
      } else if (this.cachedTargetInfo) {
        // 降级：使用纯计算值
        targetStyle = this.cachedTargetInfo.targetStyle;
      } else {
        // 两种方案都失败
        console.error('❌ 没有位置数据，动画无法继续');
        this.cancel();
        return;
      }
      
      // 启用 transition
      this.page.setData({
        shareAnimationState: 'transitioning',
        shareAnimationClass: 'active transitioning',
        shareAnimationTransform: '',
        transitionActive: false
      });
      
      // 设置目标尺寸，触发动画
      wx.nextTick(() => {
        this.page.setData({
          shareAnimationTransform: targetStyle,
          transitionActive: true
        });
      });
    }, timeline.START_TRANSITION);

    // T=START_MASK_FADEOUT: 内容开始淡入
    this.addTimer(() => {
      // 同步将导航栏和胶囊按钮变回黑色
      wx.setNavigationBarColor({
        frontColor: '#000000',
        backgroundColor: '#ffffff',
        animation: {
          duration: ANIMATION_TUNING.CONTENT_FADEIN_DURATION,
          timingFunc: 'linear'
        }
      });
      
      // 🎨 遮罩淡出的同时，让第一个帖子的图片也开始淡入（同步动画）
      this.page.setData({
        shareAnimationCompleted: true,
        hideFirstPostImage: false  // 图片开始淡入（800ms）
      });
    }, timeline.START_MASK_FADEOUT);

    // T=TRANSITION_END: 遮罩淡出完成，解除交互阻止
    this.addTimer(() => {
      // 🔓 内容完全显现，立即允许用户操作
      // 🔄 同时图片交接：隐藏动画容器，显示真实图片
      this.page.setData({
        showShareAnimation: false
      });
    }, timeline.TRANSITION_END);

    // T=REMOVE_CONTAINER: 清理动画容器
    this.addTimer(() => {
      this.cleanupAnimationContainer();
    }, timeline.REMOVE_CONTAINER);
  }
  
  /**
   * 🧹 清理动画容器（在解除交互阻止后调用）
   */
  cleanupAnimationContainer() {
    this.isPlaying = false;
    this.clearAllTimers();
    
    // 清理动画状态
    this.page.setData({
      shareAnimationImageUrl: '',
      shareAnimationClass: '',
      shareGradientClass: '',
      shareAnimationTransform: '',
      transitionActive: false
    });
    
    // 最终验证：对比动画目标位置和真实图片位置
    setTimeout(() => {
      const firstPostComponent = this.page.selectComponent('#first-post-item');
      
      if (!firstPostComponent) {
        return;
      }
      
      firstPostComponent.getImageRect()
        .then((imageRect) => {
          this.verifyFinalPosition(imageRect);
        })
        .catch(() => {
          // 测量失败，忽略
        });
    }, 50);
  }

  /**
   * 🔍 验证最终位置（调试用）
   * @param {Object} realImageRect - 真实图片的最终 boundingClientRect
   */
  verifyFinalPosition(realImageRect) {
    // 验证逻辑已移除（生产环境不需要）
    // 如需调试，可以在这里添加临时日志
  }

  /**
   * 取消动画
   */
  cancel() {
    if (!this.isPlaying) return;

    this.clearAllTimers();
    this.isPlaying = false;
    this.cachedRealRect = null;
    this.cachedTargetInfo = null;
    
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff',
      animation: { duration: 0, timingFunc: 'linear' }
    });

    this.page.setData({
      showShareAnimation: false,
      hideFirstPostImage: false,
      shareAnimationImageUrl: '',
      shareAnimationClass: '',
      shareGradientClass: '',
      shareAnimationState: 'idle',
      shareAnimationCompleted: false,
      shareAnimationTransform: '',
      transitionActive: false
    });
  }

  /**
   * 销毁控制器（页面卸载时调用）
   */
  destroy() {
    this.cancel();
    this.page = null;
    this.config = null;
    this.cachedRealRect = null;
    this.cachedTargetInfo = null;
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


