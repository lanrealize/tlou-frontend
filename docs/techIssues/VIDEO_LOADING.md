# 空状态卡片背景视频播放控制机制

## 核心设计

**目标**：在空状态卡片上优雅地播放背景视频，确保稳定性和良好体验。

**设计意图**：
1. 空状态卡片先显示（纯文字内容）
2. 用户浏览 2-3 秒
3. 视频慢慢淡入（2 秒），作为背景增强氛围

---

## 状态机

```javascript
const VIDEO_STATES = {
  IDLE: 'idle',           // 初始/清理状态
  LOADING: 'loading',     // 视频加载中（防自动播放）
  READY: 'ready',         // 视频准备就绪
  FADE_IN: 'fade_in',     // 淡入中
  PLAYING: 'playing',     // 播放中
  FADE_OUT: 'fade_out'    // 淡出中
}
```

---

## 时间配置

```javascript
const VIDEO_CONFIG = {
  CREATE_DELAY: 300,           // 创建视频元素延迟（等待 DOM 渲染）
  WAIT_BEFORE_FADE_IN: 2000,   // 2 秒后开始淡入
  FADE_DURATION: 2000,         // 淡入/淡出时长（2 秒）
  HIDE_FADE_DURATION: 500      // 页面隐藏时的快速淡出
}
```

---

## 完整流程

### 1. **初始化触发（onShow）**
```javascript
// 等待朋友圈数据加载完成，确认是空状态卡片
await circlePromise;
if (/* 需要空状态卡片 */) {
  _initEmptyCardVideoAnimation();
}
```

### 2. **延迟创建视频元素（300ms）**
```javascript
setTimeout(() => {
  setData({ showEmptyCardVideo: true }, () => {
    // 回调中创建上下文，确保元素已渲染
    this._emptyCardVideoContext = wx.createVideoContext('emptyCardVideo');
  });
}, 300);
```

**原因**：等待 MobX 数据同步和 DOM 渲染完成

### 3. **防止自动播放**
```javascript
// 在 loadedmetadata、canplay、play 事件中多次暂停
onEmptyCardVideoLoadedMetadata() {
  this._emptyCardVideoContext.pause();  // 立即暂停
  setTimeout(() => {
    this._emptyCardVideoContext.pause();  // 延迟再次暂停
  }, 50);
}
```

**原因**：小程序视频组件可能自动播放，需要强制控制

### 4. **等待 2 秒后淡入**
```javascript
setTimeout(() => {
  setData({ emptyCardVideoVisible: true });  // 开始淡入
  
  setTimeout(() => {
    this._emptyCardVideoContext.play();  // 淡入 1 秒后播放
  }, 1000);
}, 2000);
```

**时间线**：
- `t = 0s`：空状态卡片显示
- `t = 2s`：视频开始淡入（CSS：`opacity: 0 → 1`，2 秒）
- `t = 3s`：视频开始播放（淡入到一半）
- `t = 4s`：淡入完成，进入播放状态

### 5. **页面隐藏时优雅退出**
```javascript
onHide() {
  _gracefullyStopVideoAnimation();  // 快速淡出（500ms）
}
```

---

## 关键技术点

### ✅ **时序保证**
- 300ms 延迟 + setData 回调：确保视频元素存在
- 等待朋友圈数据：确保空状态卡片已渲染

### ✅ **防自动播放**
- 多次暂停（`loadedmetadata`、`canplay`、`play` 事件）
- 状态检查：只在 `FADE_IN`/`PLAYING` 状态允许播放

### ✅ **动画流畅**
- CSS `transition: opacity 2s ease`
- 2 秒淡入/淡出（页面隐藏时 500ms 快速淡出）

### ✅ **资源管理**
- 所有定时器统一管理（`_clearAllVideoTimers`）
- 页面卸载时清理视频元素和上下文

---

## 稳定性保障

| 问题 | 解决方案 |
|------|---------|
| 视频元素未渲染 | 300ms 延迟 + setData 回调 |
| 视频自动播放 | 多次暂停 + 状态检查 |
| 页面快速切换 | 快速淡出（500ms） |
| 定时器泄漏 | 统一清理机制 |
| 状态混乱 | 状态机 + 防重复触发标志 |

---

## 代码位置

- **状态常量**：`pages/main/main.js` line 11-26
- **初始化**：`pages/main/main.js` line 1119-1139
- **动画触发**：`pages/main/main.js` line 1145-1176
- **优雅退出**：`pages/main/main.js` line 1249-1268
- **CSS 动画**：`pages/main/main.wxss` line 415-478

---

## 总结

**核心机制**：状态机 + 延迟创建 + 多重防护 + 优雅动画

**稳定性来源**：
1. 时序保证（等待数据 + 延迟创建）
2. 强制控制（多次暂停 + 状态检查）
3. 完善清理（定时器管理 + 资源释放）

**用户体验**：
- 先看到文字（2 秒）
- 视频慢慢淡入（2 秒）
- 页面切换优雅淡出（500ms）

