# 导航栏工具使用说明

简化的自定义导航栏工具，45行代码搞定所有计算。

## 使用方法

### 1. 在JS中引入并使用

```javascript
const navigationHelper = require('../../utils/navigationHelper');

Page({
  onLoad() {
    const navData = navigationHelper.getNavigationData();
    this.setData({
      statusBarHeight: navData.statusBarHeight,
      navigationBarHeight: navData.navigationBarHeight,
      totalNavigationHeight: navData.totalNavigationHeight
    });
  }
});
```

### 2. 在WXML中使用

```xml
<!-- 自定义导航栏 -->
<view class="custom-navigation" style="height: {{totalNavigationHeight}}px;">
  <!-- 状态栏占位 -->
  <view class="status-bar" style="height: {{statusBarHeight}}px;"></view>
  
  <!-- 导航栏内容 -->
  <view class="navigation-bar" style="height: {{navigationBarHeight}}px;">
    <view class="nav-left">
      <view class="back-button" bindtap="onBackTap">
        <text class="back-icon">‹</text>
      </view>
    </view>
    <view class="nav-center">
      <text class="nav-title">页面标题</text>
    </view>
    <view class="nav-right"></view>
  </view>
</view>

<!-- 页面内容 -->
<view class="container" style="padding-top: {{totalNavigationHeight}}px;">
  <!-- 内容 -->
</view>
```

### 3. 在WXSS中添加样式

```css
.custom-navigation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: #ffffff;
  box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.25);
}

.status-bar {
  background-color: #ffffff;
}

.navigation-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: #ffffff;
  height: 100%;
}

.nav-left,
.nav-right {
  width: 120rpx;
  display: flex;
  align-items: center;
}

.nav-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.back-button {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: transparent;
  transition: background-color 0.2s ease;
}

.back-button:active {
  background-color: rgba(26, 115, 232, 0.1);
}

.back-icon {
  font-size: 48rpx;
  font-weight: 600;
  color: #1A73E8;
  line-height: 1;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
```

## 返回的数据

- `statusBarHeight`: 状态栏高度
- `navigationBarHeight`: 导航栏高度（固定44px）
- `totalNavigationHeight`: 总导航高度（状态栏 + 导航栏）
- `capsuleVerticalCenter`: 胶囊按钮垂直居中位置（用于对齐）

## 特性

- ✅ 自动获取真实的状态栏高度
- ✅ 智能适配不同设备
- ✅ 内置降级方案
- ✅ 代码简洁（仅45行）
- ✅ 零依赖

## 已替换的重复代码

已将以下页面中的重复代码替换为统一的工具：
- `pages/main/main.js` - getSafeAreaInfo方法
- `pages/userInfo/userInfo.js` - getSafeAreaInfo方法
- `pages/management/management.js` - 导航栏初始化