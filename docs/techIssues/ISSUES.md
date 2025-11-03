# 技术问题记录

## CSS 动画节奏不匹配 - max-height 过渡的常见陷阱

**问题现象**：使用 `max-height` 实现元素折叠动画时，出现"分段式"移动效果，动画不流畅。

**根本原因**：当 `max-height` 的初始值远大于元素实际高度时（如设置 500px 但实际高度仅 100px），CSS 过渡会在整个时间范围内从 500px 线性变化到 0。这导致前 80% 的时间内元素实际高度未变化（500→100px 阶段），后 20% 时间突然快速收缩（100→0px 阶段），造成动画节奏与其他属性（如 opacity）不同步。

**解决方案**：将 `max-height` 设置为略大于实际内容高度的合理值（如实际 100px 则设为 150px），确保整个过渡时间内都有可见的变化。避免同时使用多个影响位置的过渡属性（如 `translateY` + `max-height`），以免产生叠加的视觉错位。

**适用场景**：所有使用 `max-height` 实现的折叠/展开动画，包括评论区、下拉菜单、手风琴组件等。

---

## 穿透组件隔离获取内部元素信息

**问题场景**：需要从父页面获取子组件内部元素的位置和尺寸信息（如分享动画需要获取 post-item 内图片的精确位置），但小程序组件有严格的隔离机制，无法直接通过 `wx.createSelectorQuery()` 访问组件内部元素。

**解决方案**：在子组件内暴露公开方法，使用 `wx.createSelectorQuery().in(this)` 在组件内部查询元素，并将结果通过 Promise 返回给父页面。示例：`getImageRect()` 方法在 post-item 组件内查询图片位置，返回 boundingClientRect 信息。

**关键代码**：父页面调用 `this.selectComponent('#post-item-xxx').getImageRect()`，子组件内执行 `wx.createSelectorQuery().in(this).select('.image').boundingClientRect().exec()`。

**核心价值**：既尊重组件封装边界，又提供了灵活的数据查询能力，避免通过全局选择器破坏组件隔离性。

