# 开发者测试工具

## 核心概念

开发者测试工具用于模拟真实用户注册流程，与虚拟用户不同：
- **修改 Storage**：写入测试 openid，完全模拟真实用户

## 开始测试模式

**调用方式**：`getApp().devTools.startTestMode()`

**具体做什么**：

### Storage 操作
- ✅ **写入** mock 的 `openid` 替换真实 openid
- ❌ **删除** `userInfo`：清空用户信息

### MobX 操作
- 设置 `userInfo` = `null`

## 结束测试模式

**调用方式**：`await getApp().devTools.endTestMode()`

**具体做什么**：

### 1. 清理后端数据
- 从 Storage 获取当前 `openid`（就是测试 openid）
- 调用 `DELETE /wechat/delete-account`，删除测试用户的所有数据

### 2. Storage 操作（关键）
**完全清空所有认证数据**：
- ❌ **删除** `openid`：清空后将从服务器重新获取真实 openid
- ❌ **删除** `userInfo`：清空用户信息

### 3. MobX 操作（通过重新初始化自动完成）
调用完整初始化链恢复真实身份：
```
app.initializeApp()
  └─> userStore.initializeFromStorage()
      └─> auth.initUserAuthInStorage()
          └─> auth.getOpenid()
```

**因为 Storage 已清空，整个流程从零开始**：
1. `getOpenid()`：调用微信登录 → 后端换取**真实 openid** → 存入 Storage
2. `initUserAuthInStorage()`：用真实 openid 从后端获取用户信息 → 存入 Storage
3. `initializeFromStorage()`：从 Storage 读取真实用户信息 → 更新 MobX

最终 MobX 状态：
- `userInfo` = 真实用户信息

**结果**：完全恢复到真实用户状态

**实现位置**：`utils/devTools.js` 的 `endTestMode()` 函数（107-194行）

## 典型使用流程

```javascript
// 1. 开始测试
getApp().devTools.startTestMode()

// 2. 测试用户注册流程
// - 填写昵称、头像
// - 测试创建朋友圈
// - 测试发帖、评论等功能

// 3. 结束测试（自动清理并恢复真实身份）
await getApp().devTools.endTestMode()
```

## 实现文件

- **核心逻辑**：`utils/devTools.js`
- **初始化入口**：`app.js` 的 `initDevTools()` 方法
- **启用条件**：`DEV_MODE = true`（生产环境设为 false）

