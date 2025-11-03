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
  //    0    = 图片到达后立即开始淡入（无缝衔接）✅ 推荐
  //    100  = 图片到达后延迟100ms开始淡入
  //    500  = 图片到达后延迟500ms开始淡入
  //    -500 = 图片到达前500ms开始淡入（重叠）
  CONTENT_FADEIN_DELAY: 500,         
  
  CONTENT_FADEIN_DURATION: 2000,   // 内容淡入时长
  
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
   * 🎯 设置图片尺寸（从bindload事件获取）
   * @param {number} width - 图片宽度（可能是显示尺寸或原始尺寸）
   * @param {number} height - 图片高度（可能是显示尺寸或原始尺寸）
   */
  setImageSize(width, height) {
    console.log('📷 ========== 图片尺寸已获取 ==========');
    console.log('📐 bindload返回的尺寸:', { width, height });
    
    // 获取第一个帖子的图片数量
    const firstPost = this.page.data.posts?.[0];
    if (!firstPost || !firstPost.images) {
      console.error('❌ 无法获取第一个帖子信息');
      return;
    }
    
    const imageCount = firstPost.images.length;
    console.log('🖼️ 帖子图片数量:', imageCount);
    
    // 🔍 尝试从post数据中获取原始尺寸（更准确）
    const firstImage = firstPost.images[0];
    let actualWidth = width;
    let actualHeight = height;
    
    console.log('🔍 检查post数据中是否有图片元数据...');
    
    // 方式1：从图片对象本身获取
    if (typeof firstImage === 'object' && firstImage.width && firstImage.height) {
      actualWidth = firstImage.width;
      actualHeight = firstImage.height;
      console.log('✅ 从 firstImage 对象获取原始尺寸:', { width: actualWidth, height: actualHeight });
    }
    // 方式2：从imageMeta获取
    else if (firstPost.imageMeta && firstPost.imageMeta[0]) {
      const meta = firstPost.imageMeta[0];
      if (meta.width && meta.height) {
        actualWidth = meta.width;
        actualHeight = meta.height;
        console.log('✅ 从 imageMeta 获取原始尺寸:', { width: actualWidth, height: actualHeight });
      }
    }
    // 方式3：使用bindload返回的尺寸
    else {
      console.log('⚠️ post数据中没有尺寸信息，使用bindload返回值');
      console.log('   注意：如果bindload返回的是屏幕大小，计算会不准确！');
    }
    
    this.imageWidth = actualWidth;
    this.imageHeight = actualHeight;
    
    console.log('📐 最终使用的尺寸:', { width: actualWidth, height: actualHeight });
    console.log('📐 宽高比:', (actualWidth / actualHeight).toFixed(4));
    
    // 立即计算目标位置和尺寸
    const targetInfo = this.calculateTargetImageInfo(actualWidth, actualHeight, imageCount);
    this.cachedTargetInfo = targetInfo;
    
    console.log('✅ 目标位置和尺寸已缓存:', targetInfo);
  }

  /**
   * 📐 计算图片在post-item中的目标位置和尺寸（纯计算，无DOM查询）
   * @param {number} imageWidth - 图片原始宽度（px）
   * @param {number} imageHeight - 图片原始高度（px）
   * @param {number} imageCount - 帖子的图片总数
   * @returns {Object} 目标信息 { mode, targetWidth, targetHeight, targetLeft, targetTop, transform }
   */
  calculateTargetImageInfo(imageWidth, imageHeight, imageCount) {
    console.log('🧮 ========== 开始计算目标位置 ==========');
    console.log('📥 输入参数:');
    console.log('   - 图片宽度:', imageWidth);
    console.log('   - 图片高度:', imageHeight);
    console.log('   - 图片数量:', imageCount);
    console.log('   - 宽高比:', (imageWidth / imageHeight).toFixed(4));
    
    const systemInfo = wx.getSystemInfoSync();
    const windowWidth = systemInfo.windowWidth;
    const windowHeight = systemInfo.windowHeight;
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    
    console.log('📱 系统信息:');
    console.log('   - 窗口宽度:', windowWidth, 'px');
    console.log('   - 窗口高度:', windowHeight, 'px');
    console.log('   - 1rpx =', (windowWidth / 750).toFixed(4), 'px');
    
    // rpx 转 px
    const rpx2px = (rpx) => (windowWidth / 750) * rpx;
    
    const layout = this.config.layout;
    
    // ===== 第1步：确定图片模式和目标尺寸（rpx） =====
    let mode, targetWidthRpx, targetHeightRpx;
    
    console.log('');
    console.log('🎯 ===== 步骤1：判断图片模式 =====');
    
    if (imageCount === 1) {
      // 单张图片：根据宽高比判断横向/纵向
      const isPortrait = imageHeight > imageWidth;
      console.log('📊 单张图片，判断方向:');
      console.log('   - isPortrait =', isPortrait, '(height > width?)');
      console.log('   - height:', imageHeight);
      console.log('   - width:', imageWidth);
      
      if (isPortrait) {
        mode = 'portrait';
        console.log('   → 纵向图片模式');
        targetHeightRpx = layout.PORTRAIT_HEIGHT;
        targetWidthRpx = Math.round(targetHeightRpx * (imageWidth / imageHeight));
        console.log('   → 初始计算: 高', targetHeightRpx, 'rpx, 宽', targetWidthRpx, 'rpx');
        
        // 限制最大宽度
        if (targetWidthRpx > layout.PORTRAIT_MAX_WIDTH) {
          console.log('   → 宽度超限，重新计算（最大宽度', layout.PORTRAIT_MAX_WIDTH, 'rpx）');
          targetWidthRpx = layout.PORTRAIT_MAX_WIDTH;
          targetHeightRpx = Math.round(targetWidthRpx * (imageHeight / imageWidth));
          console.log('   → 限制后: 宽', targetWidthRpx, 'rpx, 高', targetHeightRpx, 'rpx');
        }
      } else {
        mode = 'landscape';
        console.log('   → 横向图片模式');
        targetWidthRpx = layout.LANDSCAPE_WIDTH;
        targetHeightRpx = Math.round(targetWidthRpx * (imageHeight / imageWidth));
        console.log('   → 初始计算: 宽', targetWidthRpx, 'rpx, 高', targetHeightRpx, 'rpx');
        
        // 限制最大高度
        if (targetHeightRpx > layout.LANDSCAPE_MAX_HEIGHT) {
          console.log('   → 高度超限，重新计算（最大高度', layout.LANDSCAPE_MAX_HEIGHT, 'rpx）');
          targetHeightRpx = layout.LANDSCAPE_MAX_HEIGHT;
          targetWidthRpx = Math.round(targetHeightRpx * (imageWidth / imageHeight));
          console.log('   → 限制后: 宽', targetWidthRpx, 'rpx, 高', targetHeightRpx, 'rpx');
        }
      }
    } else if (imageCount === 2) {
      mode = '2-grid';
      targetWidthRpx = targetHeightRpx = layout.GRID_2_SIZE;
      console.log('📊 2张图片模式: 正方形', targetWidthRpx, 'rpx');
    } else {
      mode = '3-plus-grid';
      targetWidthRpx = targetHeightRpx = layout.GRID_3PLUS_SIZE;
      console.log('📊 3+张图片模式: 正方形', targetWidthRpx, 'rpx');
    }
    
    console.log('');
    console.log('✅ 判断结果:');
    console.log('   - 模式:', mode);
    console.log('   - 目标尺寸(rpx): 宽', targetWidthRpx, '× 高', targetHeightRpx);
    console.log('   - 目标尺寸(px): 宽', rpx2px(targetWidthRpx).toFixed(2), '× 高', rpx2px(targetHeightRpx).toFixed(2));
    
    // ===== 第2步：计算目标位置（px） =====
    
    console.log('');
    console.log('🎯 ===== 步骤2：计算目标位置 =====');
    
    // 转换为px
    const targetWidth = rpx2px(targetWidthRpx);
    const targetHeight = rpx2px(targetHeightRpx);
    
    console.log('📐 尺寸转换:');
    console.log('   - targetWidth: ', targetWidthRpx, 'rpx →', targetWidth.toFixed(2), 'px');
    console.log('   - targetHeight:', targetHeightRpx, 'rpx →', targetHeight.toFixed(2), 'px');
    
    // 计算post-item中图片的left和top
    // left = post-item左边距 + 头像宽度 + gap
    console.log('');
    console.log('📍 计算 left（横向位置）:');
    console.log('   - POST_ITEM_MARGIN:', layout.POST_ITEM_MARGIN, 'rpx →', rpx2px(layout.POST_ITEM_MARGIN).toFixed(2), 'px');
    console.log('   - AVATAR_WIDTH:    ', layout.AVATAR_WIDTH, 'rpx →', rpx2px(layout.AVATAR_WIDTH).toFixed(2), 'px');
    console.log('   - FLEX_GAP:        ', layout.FLEX_GAP, 'rpx →', rpx2px(layout.FLEX_GAP).toFixed(2), 'px');
    
    const targetLeft = rpx2px(layout.POST_ITEM_MARGIN) + 
                       rpx2px(layout.AVATAR_WIDTH) + 
                       rpx2px(layout.FLEX_GAP);
    
    console.log('   → targetLeft = 边距 + 头像 + 间隙 =', targetLeft.toFixed(2), 'px');
    
    // top = 导航栏高度 + post-item顶部margin + 用户信息高度 + 图片margin-top
    console.log('');
    console.log('📍 计算 top（纵向位置）:');
    const navigationHeight = this.page.data.navigationData?.totalNavigationHeight || 0;
    console.log('   - navigationHeight:', navigationHeight.toFixed(2), 'px', navigationHeight === 0 ? '⚠️ 可能未获取到导航栏高度！' : '');
    
    const postItemTopMargin = rpx2px(20); // .post-item 的 margin-top
    console.log('   - postItemTopMargin:', '20 rpx →', postItemTopMargin.toFixed(2), 'px');
    console.log('   - USER_INFO_HEIGHT: ', layout.USER_INFO_HEIGHT, 'rpx →', rpx2px(layout.USER_INFO_HEIGHT).toFixed(2), 'px');
    console.log('   - IMAGE_MARGIN_TOP: ', layout.IMAGE_MARGIN_TOP, 'rpx →', rpx2px(layout.IMAGE_MARGIN_TOP).toFixed(2), 'px');
    
    const targetTop = navigationHeight + 
                      postItemTopMargin + 
                      rpx2px(layout.USER_INFO_HEIGHT) + 
                      rpx2px(layout.IMAGE_MARGIN_TOP);
    
    console.log('   → targetTop = 导航栏 + post边距 + 用户信息 + 图片边距');
    console.log('   →          =', navigationHeight.toFixed(2), '+', postItemTopMargin.toFixed(2), '+', 
                rpx2px(layout.USER_INFO_HEIGHT).toFixed(2), '+', rpx2px(layout.IMAGE_MARGIN_TOP).toFixed(2));
    console.log('   →          =', targetTop.toFixed(2), 'px');
    
    console.log('');
    console.log('✅ 位置和尺寸结果:');
    console.log('   📍 位置: left =', targetLeft.toFixed(2), 'px, top =', targetTop.toFixed(2), 'px');
    console.log('   📏 尺寸: width =', targetWidth.toFixed(2), 'px, height =', targetHeight.toFixed(2), 'px');
    
    // ===== 第3步：计算transform =====
    
    console.log('');
    console.log('🎯 ===== 步骤3：计算 Transform =====');
    
    // 缩放比例
    const scale = targetWidth / windowWidth;
    console.log('📐 缩放比例:');
    console.log('   - scale = targetWidth / windowWidth');
    console.log('   - scale =', targetWidth.toFixed(2), '/', windowWidth.toFixed(2));
    console.log('   - scale =', scale.toFixed(4));
    
    // 中心点对齐
    console.log('');
    console.log('📍 计算中心点偏移:');
    const imageCenterX = targetLeft + targetWidth / 2;
    const imageCenterY = targetTop + targetHeight / 2;
    const screenCenterX = windowWidth / 2;
    const screenCenterY = windowHeight / 2;
    
    console.log('   - 目标图片中心: (', imageCenterX.toFixed(2), ',', imageCenterY.toFixed(2), ')');
    console.log('   - 屏幕中心:     (', screenCenterX.toFixed(2), ',', screenCenterY.toFixed(2), ')');
    
    const offsetX = imageCenterX - screenCenterX;
    const offsetY = imageCenterY - screenCenterY;
    
    console.log('   - 偏移量(px):   (', offsetX.toFixed(2), ',', offsetY.toFixed(2), ')');
    
    // 因为有scale，偏移需要除以scale
    const translateX = offsetX / scale;
    const translateY = offsetY / scale;
    
    console.log('   - 缩放后偏移:   (', translateX.toFixed(2), ',', translateY.toFixed(2), ')');
    console.log('   （因为容器被缩放了，translate值需要除以scale）');
    
    const transform = `scale(${scale.toFixed(4)}) translate(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px)`;
    
    console.log('');
    console.log('✅ 最终 Transform:', transform);
    console.log('✅ ========== 计算完成 ==========');
    
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
      // ✨ 新增：CSS样式字符串（用于直接设置宽高）
      targetStyle: `width: ${targetWidth}px; height: ${targetHeight}px; left: ${targetLeft}px; top: ${targetTop}px;`
    };
  }

  /**
   * 启动动画 - 完整三步流程
   * @param {string} imageUrl - 图片URL
   */
  start(imageUrl) {
    if (this.isPlaying) {
      console.warn('⚠️ 动画已在播放中，忽略重复启动');
      return;
    }

    console.log('🎬 ========== 启动分享动画 ==========');
    console.log('📷 图片URL:', imageUrl);
    console.log('');
    console.log('🎛️ ===== 当前动画参数配置 =====');
    console.log('📝 开场动画:', ANIMATION_TUNING.OPENING_DURATION, 'ms');
    console.log('👀 欣赏时长:', ANIMATION_TUNING.APPRECIATION_DURATION, 'ms');
    console.log('🔄 图片移动:', ANIMATION_TUNING.IMAGE_TRANSITION_DURATION, 'ms');
    console.log('⚡ 内容淡入延迟:', ANIMATION_TUNING.CONTENT_FADEIN_DELAY, 'ms',
      ANIMATION_TUNING.CONTENT_FADEIN_DELAY === 0 ? '(无缝衔接)' :
      ANIMATION_TUNING.CONTENT_FADEIN_DELAY > 0 ? '(顺序执行)' : '(优雅重叠)');
    console.log('🌫️ 内容淡入时长:', ANIMATION_TUNING.CONTENT_FADEIN_DURATION, 'ms');
    console.log('⏱️ 总时长:', this.config.timeline.REMOVE_CONTAINER, 'ms');
    console.log('');
    console.log('📅 ===== 计算后的时间线 =====');
    console.log('   T=0ms    : 容器显示');
    console.log(`   T=${this.config.timeline.ADD_ACTIVE_CLASS}ms  : 开场动画开始`);
    console.log(`   T=${this.config.timeline.OPENING_END}ms : 开场动画结束`);
    console.log(`   T=${this.config.timeline.START_TRANSITION}ms : 图片开始移动`);
    console.log(`   T=${this.config.timeline.IMAGE_ARRIVED}ms : 图片到达目标`);
    console.log(`   T=${this.config.timeline.START_MASK_FADEOUT}ms : 内容开始淡入`);
    console.log(`   T=${this.config.timeline.TRANSITION_END}ms : 内容完全显现`);
    console.log(`   T=${this.config.timeline.REMOVE_CONTAINER}ms : 移除动画容器`);
    console.log('');
    console.log('💡 提示：修改 ANIMATION_TUNING 参数即可调整动画节奏！');

    this.isPlaying = true;
    const { timeline } = this.config;

    // ===== T=0ms: 容器显示（onLoad 时已设置） =====
    this.page.setData({
      shareAnimationState: 'playing',
      shareAnimationImageUrl: imageUrl
    });

    // ===== 阶段1：开场动画（T=0 ~ T=3000） =====
    
    // T=500ms: 添加 active class（触发开场动画）
    this.addTimer(() => {
      console.log('✨ [T=500ms] 阶段1：添加 active class（触发开场动画）');
      this.page.setData({
        shareAnimationClass: 'active',
        shareGradientClass: 'active'
      });
    }, timeline.ADD_ACTIVE_CLASS);

    // T=3000ms: 开场动画结束
    this.addTimer(() => {
      console.log('🎬 [T=3000ms] 阶段1完成：开场动画结束');
      console.log('⏳ 进入阶段2：全屏欣赏（2秒）');
    }, timeline.OPENING_END);

    // ===== 阶段3：过渡动画（T=5000 ~ T=6200） =====
    
    // T=5000ms: 开始过渡（第一步：启用transition，保持当前尺寸）
    this.addTimer(() => {
      console.log('🎬 ========== [T=5000ms] 阶段3：开始过渡 ==========');
      
      // 🔍 先检查遮罩层的初始状态
      console.log('🔍 [调试] 检查过渡开始前的遮罩层状态...');
      wx.createSelectorQuery()
        .in(this.page)
        .select('.content-fade-mask')
        .fields({ computedStyle: ['opacity', 'backgroundColor'], dataset: true })
        .exec((res) => {
          console.log('🔍 [调试] 过渡前的遮罩层状态:', res[0]);
          console.log('   → 应该是：opacity = 1, backgroundColor = rgba(0, 0, 0, 1)');
          console.log('   → 应该没有 fade-out class');
        });
      
      // 检查是否已有缓存的目标信息
      if (!this.cachedTargetInfo) {
        console.error('❌ 未找到缓存的目标信息，动画无法继续');
        console.error('   可能原因：图片未加载完成或setImageSize未被调用');
        this.cancel();
        return;
      }
      
      const { targetStyle } = this.cachedTargetInfo;
      console.log('🎯 使用缓存的targetStyle:', targetStyle);
      
      // 🔍 调试：记录过渡前的实际尺寸
      console.log('🔍 ========== 调试：查询过渡前的实际DOM状态 ==========');
      wx.createSelectorQuery()
        .in(this.page)
        .select('.share-animation-container')
        .boundingClientRect()
        .select('.share-animation-image')
        .boundingClientRect()
        .exec((res) => {
          console.log('📦 过渡前 - 容器尺寸:', res[0]);
          console.log('📦 过渡前 - 图片尺寸:', res[1]);
        });
      
      // 🔑 关键：第一步只添加 class（启用 transition），不设置目标尺寸
      console.log('📝 第1步：添加 transitioning class（启用transition，保持全屏）');
      this.page.setData({
        shareAnimationState: 'transitioning',
        shareAnimationClass: 'active transitioning',
        shareAnimationTransform: '',  // ⚠️ 先不设置尺寸！保持全屏
        transitionActive: false
      });
      
      // 🔍 调试：记录添加class后的尺寸（看是否有变化）
      setTimeout(() => {
        console.log('🔍 ========== 调试：添加transitioning class后的DOM状态 ==========');
        wx.createSelectorQuery()
          .in(this.page)
          .select('.share-animation-container')
          .boundingClientRect()
          .select('.share-animation-image')
          .boundingClientRect()
          .exec((res) => {
            console.log('📦 添加class后 - 容器尺寸:', res[0]);
            console.log('📦 添加class后 - 图片尺寸:', res[1]);
            console.log('⚠️ 如果这里的尺寸和过渡前不同，说明添加class本身就改变了尺寸！');
          });
      }, 50);
      
      // 使用nextTick确保transition属性已生效
      wx.nextTick(() => {
        console.log('🚀 第2步：设置目标尺寸，触发图片缩小动画...');
        console.log('   🎬 注意：此时 shareAnimationCompleted 保持 false，遮罩不动');
        console.log('⏰ [调试] 当前时间戳:', Date.now());
        console.log('📊 [调试] 即将执行 setData，设置以下状态：');
        console.log('   - shareAnimationTransform:', targetStyle);
        console.log('   - transitionActive: true');
        console.log('   - shareAnimationCompleted: false ← 遮罩暂时不动！');
        
        this.page.setData({
          shareAnimationTransform: targetStyle,  // ✅ 现在设置目标尺寸，触发transition
          transitionActive: true
          // ⚠️ 不设置 shareAnimationCompleted，遮罩保持 opacity=1
        }, () => {
          console.log('✅ [调试] setData 回调执行！数据已更新到视图');
          console.log('⏰ [调试] 回调时间戳:', Date.now());
          console.log('   → 此时只有图片容器开始缩小，遮罩保持不动');
          
          // 🔍 追踪DOM状态
          wx.createSelectorQuery()
            .in(this.page)
            .select('.share-animation-container')
            .boundingClientRect()
            .select('.content-fade-mask')
            .fields({ computedStyle: ['opacity'] })
            .exec((res) => {
              console.log('🔍 [调试] 图片动画开始时刻的DOM状态：');
              console.log('   📦 图片容器:', res[0]);
              console.log(`   ⬜ 白色遮罩: opacity=${res[1]?.opacity} (应该保持=1)`);
            });
        });
        console.log('   - 背景：黑色 → 白色（page-black-bg 类移除，但被白色遮罩遮住）');
        console.log('   - ⬜ 白色遮罩：保持 opacity=1（遮住所有内容）');
        console.log('   - 📦 图片容器：全屏 → 目标尺寸位置（2秒 cubic-bezier 动画）');
        console.log('   - 📄 页面内容：已渲染但完全被遮罩遮住');
        console.log('   - 🖼️ 第一个post图片：继续隐藏（hideImage=true）');
        console.log('   ⏳ 等待2秒，图片到达目标位置后再开始遮罩淡出...');
        console.log('   - 📊 当前 data 状态:', {
          showShareAnimation: this.page.data.showShareAnimation,
          shareAnimationCompleted: this.page.data.shareAnimationCompleted
        });
        
        // 🔍 调试：记录设置目标尺寸后的初始状态
        setTimeout(() => {
          console.log('🔍 ========== 调试：设置目标尺寸后的DOM状态 ==========');
          wx.createSelectorQuery()
            .in(this.page)
            .select('.share-animation-container')
            .boundingClientRect()
            .select('.share-animation-image')
            .boundingClientRect()
            .exec((res) => {
              console.log('📦 设置目标尺寸后 - 容器尺寸:', res[0]);
              console.log('📦 设置目标尺寸后 - 图片尺寸:', res[1]);
            });
        }, 50);
      });
    }, timeline.START_TRANSITION);

    // T=START_MASK_FADEOUT: 内容开始淡入
    this.addTimer(() => {
      const delay = ANIMATION_TUNING.CONTENT_FADEIN_DELAY;
      console.log(`🎨 [T=${timeline.START_MASK_FADEOUT}ms] 内容开始淡入！`);
      if (delay === 0) {
        console.log('   - 图片刚刚到达目标位置 ✅');
        console.log('   - 无缝衔接开始内容淡入 ✨');
      } else if (delay > 0) {
        console.log(`   - 图片到达后延迟了 ${delay}ms ⏰`);
        console.log(`   - 现在开始内容淡入（${ANIMATION_TUNING.CONTENT_FADEIN_DURATION}ms）`);
      } else {
        const overlap = -delay;
        console.log(`   - 图片还有 ${overlap}ms 到达目标位置`);
        console.log(`   - 优雅重叠：图片和内容同时运动 ✨`);
      }
      console.log(`   - 白色遮罩开始淡出（${ANIMATION_TUNING.CONTENT_FADEIN_DURATION}ms）`);
      
      this.page.setData({
        shareAnimationCompleted: true  // 🎬 触发遮罩淡出！
      }, () => {
        console.log('✅ [调试] shareAnimationCompleted 已设置为 true');
        console.log('   → 白色遮罩开始淡出（2秒）');
        console.log('   → 图片和内容淡入优雅重叠 ✨');
        
        // 🔍 定期检查遮罩层状态（2秒白色遮罩淡出动画）
        const checkMaskState = (delay, expectedOpacity) => {
          setTimeout(() => {
            wx.createSelectorQuery()
              .in(this.page)
              .select('.content-fade-mask')
              .fields({ computedStyle: ['opacity'] })
              .exec((res) => {
                const actual = res[0]?.opacity;
                console.log(`🔍 [遮罩淡出] T+${delay}ms: opacity=${actual} (预期≈${expectedOpacity})`);
              });
          }, delay);
        };
        
        checkMaskState(50, 1.0);    // 刚开始
        checkMaskState(500, 0.75);  // 消失25%
        checkMaskState(1000, 0.5);  // 中点，消失50%
        checkMaskState(1500, 0.25); // 消失75%
        checkMaskState(2000, 0);    // 完全透明
      });
    }, timeline.START_MASK_FADEOUT);

    // T=IMAGE_ARRIVED: 图片到达目标位置
    this.addTimer(() => {
      const delay = ANIMATION_TUNING.CONTENT_FADEIN_DELAY;
      console.log(`✅ [T=${timeline.IMAGE_ARRIVED}ms] 图片已到达目标位置！`);
      console.log(`   - 图片移动动画完成（${ANIMATION_TUNING.IMAGE_TRANSITION_DURATION}ms）✅`);
      if (delay === 0) {
        console.log('   - 内容同时开始淡入 ✨');
      } else if (delay > 0) {
        console.log(`   - 内容将在 ${delay}ms 后开始淡入...`);
      } else {
        const remaining = ANIMATION_TUNING.CONTENT_FADEIN_DURATION + delay;
        console.log(`   - 内容仍在淡入中（还剩 ${remaining}ms）...`);
      }
      
      // 🔍 对比计算位置和实际DOM位置
      console.log('');
      console.log('🔍 ========== 验证：对比计算位置 vs 实际位置 ==========');
      wx.createSelectorQuery()
        .in(this.page)
        .select('.share-animation-container')
        .boundingClientRect()
        .select('.post-item:first-child .image-content image')
        .boundingClientRect()
        .exec((res) => {
          const animationRect = res[0];
          const realImageRect = res[1];
          
          console.log('📦 动画容器实际位置:', animationRect);
          console.log('🖼️ 真实图片位置:', realImageRect);
          
          if (this.cachedTargetInfo && animationRect && realImageRect) {
            const { targetLeft, targetTop, targetWidth, targetHeight } = this.cachedTargetInfo;
            
            console.log('');
            console.log('📊 位置对比:');
            console.log('   计算值 vs 实际值（动画容器）vs 真实图片');
            console.log('   left:  ', targetLeft.toFixed(2), 'vs', animationRect.left.toFixed(2), 'vs', realImageRect.left.toFixed(2));
            console.log('   top:   ', targetTop.toFixed(2), 'vs', animationRect.top.toFixed(2), 'vs', realImageRect.top.toFixed(2));
            console.log('   width: ', targetWidth.toFixed(2), 'vs', animationRect.width.toFixed(2), 'vs', realImageRect.width.toFixed(2));
            console.log('   height:', targetHeight.toFixed(2), 'vs', animationRect.height.toFixed(2), 'vs', realImageRect.height.toFixed(2));
            
            const leftDiff = Math.abs(animationRect.left - realImageRect.left);
            const topDiff = Math.abs(animationRect.top - realImageRect.top);
            const widthDiff = Math.abs(animationRect.width - realImageRect.width);
            const heightDiff = Math.abs(animationRect.height - realImageRect.height);
            
            console.log('');
            console.log('📏 动画容器与真实图片的误差:');
            console.log('   left差值:  ', leftDiff.toFixed(2), 'px', leftDiff > 5 ? '⚠️ 偏差较大' : '✅');
            console.log('   top差值:   ', topDiff.toFixed(2), 'px', topDiff > 5 ? '⚠️ 偏差较大' : '✅');
            console.log('   width差值: ', widthDiff.toFixed(2), 'px', widthDiff > 5 ? '⚠️ 偏差较大' : '✅');
            console.log('   height差值:', heightDiff.toFixed(2), 'px', heightDiff > 5 ? '⚠️ 偏差较大' : '✅');
            
            if (leftDiff <= 5 && topDiff <= 5 && widthDiff <= 5 && heightDiff <= 5) {
              console.log('');
              console.log('✅ 位置完美对齐！误差在5px以内');
            } else {
              console.log('');
              console.log('⚠️ 位置对齐不够精确，可能需要调整计算逻辑');
            }
          }
          console.log('✅ ========== 验证完成 ==========');
        });
    }, timeline.IMAGE_ARRIVED);
    
    // T=TRANSITION_END: 遮罩淡出完成，内容完全显现
    this.addTimer(() => {
      console.log(`✅ [T=${timeline.TRANSITION_END}ms] 阶段3完成：内容完全显现！`);
      console.log('   - 图片已在目标位置 ✅');
      console.log('   - 白色遮罩完全透明 ✅');
      console.log('   - 内容完全显现 ✅');
      console.log(`   - 动画总时长：${timeline.TRANSITION_END}ms ✨`);
    }, timeline.TRANSITION_END);

    // T=REMOVE_CONTAINER: 无缝切换（移除动画容器）
    this.addTimer(() => {
      console.log(`🔄 [T=${timeline.REMOVE_CONTAINER}ms] 移除动画容器`);
      
      // 🖼️ 等待第一张图片加载完成且骨架屏消失
      const waitForImageReady = () => {
        const firstPostComponent = this.page.selectComponent('#first-post-item');
        
        if (!firstPostComponent) {
          console.warn('⚠️ 无法获取第一个 post-item 组件，直接移除动画容器');
          this.removeAnimationContainer();
          return;
        }
        
        const isReady = firstPostComponent.isFirstImageFullyLoaded();
        console.log('🖼️ 第一张图片加载状态:', isReady ? '✅ 已加载完成' : '⏳ 加载中...');
        
        if (isReady) {
          // 图片已加载完成，骨架屏已消失，可以安全移除动画容器
          this.removeAnimationContainer();
        } else {
          // 图片还在加载，等待150ms后再检查（与骨架屏延迟一致）
          console.log('   → 等待150ms后再检查...');
          setTimeout(waitForImageReady, 150);
        }
      };
      
      waitForImageReady();
    }, timeline.REMOVE_CONTAINER);
  }
  
  /**
   * 🗑️ 移除动画容器
   */
  removeAnimationContainer() {
    console.log('🗑️ 正在移除动画容器...');
    console.log('   → 即将设置 showShareAnimation = false');
    console.log('   → 这会导致第一个 post 的 hideImage = false');
    console.log('   → 真实图片将立即显示（opacity: 0 → 1）');
    
    this.page.setData({
      showShareAnimation: false,  // ✅ 移除动画容器
      shareAnimationImageUrl: '',
      shareAnimationClass: '',
      shareGradientClass: '',
      shareAnimationTransform: '',
      transitionActive: false
    }, () => {
      // 🔍 最终验证：对比计算位置和真实图片位置
      setTimeout(() => {
        console.log('');
        console.log('🔍 ========== 最终验证：检查真实图片位置 ==========');
        
        // 🔑 通过组件实例查询（解决样式隔离问题）
        const firstPostComponent = this.page.selectComponent('#first-post-item');
        
        if (!firstPostComponent) {
          console.error('❌ 无法获取第一个 post-item 组件实例！');
          console.log('   可能原因: 组件未渲染或 id 设置不正确');
          return;
        }
        
        console.log('✅ 成功获取第一个 post-item 组件实例');
        console.log('🎯 调用组件的 getImageRect() 方法...');
        
        // 调用组件方法获取图片位置
        firstPostComponent.getImageRect()
          .then((imageRect) => {
            console.log('✅ 成功从组件内部获取图片位置!');
            console.log('📦 图片位置:', imageRect);
            this.verifyFinalPosition(imageRect);
          })
          .catch((error) => {
            console.error('❌ 从组件获取图片位置失败:', error);
            console.log('   → 这可能是因为图片还未加载或 hideImage 仍然为 true');
          });
      }, 100);
    });
    
    this.isPlaying = false;
    this.clearAllTimers();
    
    console.log('✅ ========== 动画完成 ==========');
  }

  /**
   * 🔍 验证最终位置（对比计算值和实际值）
   * @param {Object} realImageRect - 真实图片的 boundingClientRect
   */
  verifyFinalPosition(realImageRect) {
    if (!this.cachedTargetInfo) {
      console.error('❌ 没有缓存的计算结果');
      return;
    }
    
    const { targetLeft, targetTop, targetWidth, targetHeight } = this.cachedTargetInfo;
    
    console.log('');
    console.log('📊 位置对比（计算值 vs 真实图片）:');
    console.log('   left:   ', targetLeft.toFixed(2), 'vs', realImageRect.left.toFixed(2), 'px');
    console.log('   top:    ', targetTop.toFixed(2), 'vs', realImageRect.top.toFixed(2), 'px');
    console.log('   width:  ', targetWidth.toFixed(2), 'vs', realImageRect.width.toFixed(2), 'px');
    console.log('   height: ', targetHeight.toFixed(2), 'vs', realImageRect.height.toFixed(2), 'px');
    
    const leftDiff = Math.abs(targetLeft - realImageRect.left);
    const topDiff = Math.abs(targetTop - realImageRect.top);
    const widthDiff = Math.abs(targetWidth - realImageRect.width);
    const heightDiff = Math.abs(targetHeight - realImageRect.height);
    
    console.log('');
    console.log('📏 误差分析:');
    console.log('   left差值:   ', leftDiff.toFixed(2), 'px', leftDiff > 5 ? '⚠️ 偏差较大' : leftDiff > 1 ? '⚡ 有偏差' : '✅ 完美');
    console.log('   top差值:    ', topDiff.toFixed(2), 'px', topDiff > 5 ? '⚠️ 偏差较大' : topDiff > 1 ? '⚡ 有偏差' : '✅ 完美');
    console.log('   width差值:  ', widthDiff.toFixed(2), 'px', widthDiff > 5 ? '⚠️ 偏差较大' : widthDiff > 1 ? '⚡ 有偏差' : '✅ 完美');
    console.log('   height差值: ', heightDiff.toFixed(2), 'px', heightDiff > 5 ? '⚠️ 偏差较大' : heightDiff > 1 ? '⚡ 有偏差' : '✅ 完美');
    
    const maxDiff = Math.max(leftDiff, topDiff, widthDiff, heightDiff);
    
    console.log('');
    if (maxDiff <= 1) {
      console.log('🎉 完美对齐！最大误差仅', maxDiff.toFixed(2), 'px');
    } else if (maxDiff <= 5) {
      console.log('✅ 对齐良好！最大误差', maxDiff.toFixed(2), 'px（在可接受范围内）');
    } else {
      console.log('⚠️ 对齐不够精确！最大误差', maxDiff.toFixed(2), 'px');
      console.log('');
      console.log('🔍 可能的原因:');
      if (leftDiff > 5) {
        console.log('   - left偏差大: 检查 POST_ITEM_MARGIN、AVATAR_WIDTH、FLEX_GAP');
      }
      if (topDiff > 5) {
        console.log('   - top偏差大: 检查 navigationHeight、USER_INFO_HEIGHT、IMAGE_MARGIN_TOP');
      }
      if (widthDiff > 5 || heightDiff > 5) {
        console.log('   - 尺寸偏差大: 检查图片原始尺寸获取是否正确');
      }
    }
    
    console.log('✅ ========== 验证完成 ==========');
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
      shareAnimationCompleted: false,
      shareAnimationTransform: '',
      transitionActive: false
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

