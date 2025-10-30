# 视频背景动画实现（精简版）

## 需求
- 初始：白色背景，无视频
- 3秒后：视频+毛玻璃淡入（2秒）
- 播放完毕：淡出回到初始状态（2秒）
- 页面切换：立即停止，重新进入时重新开始

## 状态机
```javascript
const VIDEO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  FADE_IN: 'fade_in',
  PLAYING: 'playing',
  FADE_OUT: 'fade_out'
};

const CONFIG = {
  CREATE_DELAY: 300,
  READY_DELAY: 100,
  WAIT_BEFORE_FADE_IN: 3000,
  FADE_DURATION: 2000
};
```

## 布局结构说明

视频和毛玻璃通过 **绝对定位 + z-index 分层** 实现：

```
┌─────────────────────────────────┐
│  .empty-card (容器)             │
│  ├─ .video-bg (z-index: 0)     │  ← 最底层：视频背景
│  ├─ .glass-overlay (z-index: 1)│  ← 中间层：毛玻璃遮罩
│  └─ .empty-content (z-index: 2)│  ← 最上层：文字和按钮
└─────────────────────────────────┘
```

### 关键点：
1. **容器**：`.empty-card` 设置 `position: relative` + `overflow: hidden`
2. **视频**：`position: absolute` 铺满整个容器（top:0, left:0, width:100%, height:100%）
3. **毛玻璃**：同样绝对定位铺满，使用 `backdrop-filter` 模糊视频
4. **内容**：`position: relative` + `z-index: 2` 确保在最上层

## WXML
```xml
<view class="empty-card {{videoState === 'playing' ? 'video-active' : 'video-inactive'}}">
  <!-- 视频层：绝对定位，铺满整个卡片 -->
  <video 
    wx:if="{{showVideo}}"
    class="video-bg {{videoVisible ? 'fade-in' : 'fade-out'}}"
    src="视频URL"
    autoplay muted
    show-center-play-btn="{{false}}"
    show-play-btn="{{false}}"
    controls="{{false}}"
    objectFit="cover"
    bindcanplay="onVideoCanPlay"
    bindended="onVideoEnded"
    binderror="onVideoError"
  ></video>
  
  <!-- 毛玻璃层：绝对定位，在视频上方 -->
  <view wx:if="{{showVideo}}" class="glass-overlay {{videoVisible ? 'fade-in' : 'fade-out'}}"></view>
  
  <!-- 内容层：相对定位，在最上层 -->
  <view class="empty-content">
    <view class="empty-title {{videoVisible ? 'text-light' : 'text-dark'}}">标题</view>
    <view class="empty-desc {{videoVisible ? 'text-light' : 'text-dark'}}">描述</view>
    <view class="divider {{videoVisible ? 'divider-light' : 'divider-dark'}}"></view>
    <view class="btn {{videoVisible ? 'btn-light' : 'btn-dark'}}">按钮</view>
  </view>
</view>
```

## WXSS

### 1. 容器样式（关键：relative + overflow:hidden）
```css
.empty-card {
  position: relative;        /* 为子元素的 absolute 定位提供参照 */
  margin: 30rpx 40rpx;
  border-radius: 10rpx;
  padding: 44rpx 40rpx 36rpx 40rpx;
  overflow: hidden;          /* 裁剪超出的视频边缘 */
  transition: background-color 2s ease, box-shadow 2s ease;
}

/* 无视频时：白色背景 */
.empty-card.video-inactive {
  background: #ffffff;
  box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.25);
}

/* 有视频时：黑色背景（防止视频加载时白屏） */
.empty-card.video-active {
  background: #000000;
  box-shadow: 0px 8rpx 24rpx rgba(0, 0, 0, 0.12);
}
```

### 2. 视频层（z-index: 0，最底层）
```css
.video-bg {
  position: absolute;        /* 绝对定位，脱离文档流 */
  top: 0; 
  left: 0;
  width: 100%;              /* 铺满整个容器 */
  height: 100%;
  z-index: 0;               /* 最底层 */
  border-radius: 10rpx;     /* 和容器圆角一致 */
  background: #000000;      /* 视频加载前的占位背景 */
  opacity: 0;               /* 初始透明 */
  transition: opacity 2s ease;  /* 淡入淡出动画 */
}

.video-bg.fade-in { opacity: 1; }    /* 淡入：完全显示 */
.video-bg.fade-out { opacity: 0; }   /* 淡出：完全透明 */
```

### 3. 毛玻璃层（z-index: 1，中间层）
```css
.glass-overlay {
  position: absolute;        /* 绝对定位 */
  top: 0; 
  left: 0;
  width: 100%;              /* 铺满整个容器 */
  height: 100%;
  z-index: 1;               /* 在视频上方 */
  border-radius: 10rpx;
  
  /* 渐变半透明黑色遮罩（上下深，中间浅） */
  background: linear-gradient(
    180deg, 
    rgba(0,0,0,0.5) 0%,      /* 顶部 50% 不透明 */
    rgba(0,0,0,0.35) 50%,    /* 中部 35% 不透明 */
    rgba(0,0,0,0.5) 100%     /* 底部 50% 不透明 */
  );
  
  /* 毛玻璃效果：模糊 + 饱和度提升 */
  backdrop-filter: blur(6px) saturate(120%);
  -webkit-backdrop-filter: blur(6px) saturate(120%);
  
  opacity: 0;               /* 初始透明 */
  transition: opacity 2s ease;  /* 淡入淡出动画 */
}

.glass-overlay.fade-in { opacity: 1; }
.glass-overlay.fade-out { opacity: 0; }
```

### 4. 内容层（z-index: 2，最上层）
```css
.empty-content { 
  position: relative;        /* 相对定位，保持在文档流中 */
  z-index: 2;               /* 最上层，在视频和毛玻璃之上 */
}

/* 文字颜色：根据是否有视频切换深浅 */
.text-dark { 
  color: #000000; 
  text-shadow: none; 
}

.text-light { 
  color: #ffffff; 
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.8);  /* 白色文字加深色阴影，提高可读性 */
}

/* 分割线：根据是否有视频切换样式 */
.divider-dark { background-color: #E0E0E0; }
.divider-light { 
  background: linear-gradient(
    90deg, 
    rgba(255,255,255,0) 0%, 
    rgba(255,255,255,0.3) 50%, 
    rgba(255,255,255,0) 100%
  ); 
}

/* 按钮：根据是否有视频切换字重 */
.btn-dark { color: #1A73E8; font-weight: 400; }
.btn-light { color: #1A73E8; font-weight: 600; }

/* 所有元素添加过渡动画 */
.empty-title, .empty-desc, .divider, .btn {
  transition: color 2s ease, text-shadow 2s ease, background 2s ease, font-weight 2s ease;
}
```

### 🎨 毛玻璃效果原理
```
backdrop-filter: blur(6px)      ← 模糊背景（视频）
                 saturate(120%) ← 提高饱和度，让视频更鲜艳
```

**注意**：
- `backdrop-filter` 只模糊**背后的内容**（视频），不影响文字
- 需要配合半透明背景使用才有效
- iOS 需要 `-webkit-` 前缀

## JavaScript
```javascript
data: {
  videoState: VIDEO_STATES.IDLE,
  showVideo: false,
  videoVisible: false
},

_allowVideoAnimation: false,
_videoAnimationTimer: null,
_createVideoTimer: null,
_readyTimer: null,

// 核心方法
_initVideoAnimation() {
  this._allowVideoAnimation = false;
  this._resetVideoState();
  
  this._createVideoTimer = setTimeout(() => {
    this.setData({ videoState: VIDEO_STATES.LOADING, showVideo: true });
    this._readyTimer = setTimeout(() => {
      this._allowVideoAnimation = true;
    }, CONFIG.READY_DELAY);
  }, CONFIG.CREATE_DELAY);
},

_triggerVideoAnimation() {
  if (!this._allowVideoAnimation || this._videoAnimationTimer || 
      this.data.videoState !== VIDEO_STATES.LOADING) return;
  
  this.setData({ videoState: VIDEO_STATES.READY });
  this._videoAnimationTimer = setTimeout(() => {
    this.setData({ videoState: VIDEO_STATES.FADE_IN, videoVisible: true });
    this._videoAnimationTimer = setTimeout(() => {
      this.setData({ videoState: VIDEO_STATES.PLAYING });
    }, CONFIG.FADE_DURATION);
  }, CONFIG.WAIT_BEFORE_FADE_IN);
},

_fadeOutVideo() {
  this.setData({ videoState: VIDEO_STATES.FADE_OUT, videoVisible: false });
  this._videoAnimationTimer = setTimeout(() => {
    this.setData({ videoState: VIDEO_STATES.IDLE, showVideo: false });
  }, CONFIG.FADE_DURATION);
},

_resetVideoState() {
  this._clearAllTimers();
  this.setData({ videoState: VIDEO_STATES.IDLE, showVideo: false, videoVisible: false });
  this._allowVideoAnimation = false;
},

_clearAllTimers() {
  [this._videoAnimationTimer, this._createVideoTimer, this._readyTimer].forEach(t => {
    if (t) clearTimeout(t);
  });
  this._videoAnimationTimer = this._createVideoTimer = this._readyTimer = null;
},

_stopVideoAnimation() {
  this._allowVideoAnimation = false;
  this.setData({ showVideo: false });
  this._clearAllTimers();
},

// 事件处理
onVideoCanPlay() { this._triggerVideoAnimation(); },
onVideoEnded() {
  if (this._allowVideoAnimation && this.data.videoState === VIDEO_STATES.PLAYING) {
    this._fadeOutVideo();
  }
},
onVideoError(e) { this._resetVideoState(); },

// 生命周期
pageLifetimes: {
  show() { if (this.properties.enableVideo) this._initVideoAnimation(); },
  hide() { this._stopVideoAnimation(); }
}
```

## 关键点
1. **wx:if 控制视频存在**：完全移除/创建视频元素，停止后台播放
2. **双重状态**：`showVideo`（元素存在） + `videoVisible`（透明度）
3. **防重复**：检查 `_allowVideoAnimation` + `_videoAnimationTimer` + `videoState`
4. **清理**：页面隐藏时立即移除视频元素并清理定时器

## 调试
```javascript
console.log('状态:', this.data.videoState, 'show:', this.data.showVideo, 'visible:', this.data.videoVisible);
```

## 时间线
```
onShow → 300ms → 创建视频 → 100ms → 允许动画 → 视频就绪 → 
3000ms → 淡入(2s) → 播放 → 视频结束 → 淡出(2s) → IDLE
```

