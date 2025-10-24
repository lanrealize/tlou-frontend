# 虚拟用户管理逻辑

## 核心概念

虚拟用户是管理员用于测试的模拟用户账号，可以快速切换身份进行功能测试。

## 虚拟用户创建

1. 管理员在管理页面输入昵称、上传头像
2. 调用后端 `POST /admin/virtual-users`，传递 `{ username, avatar }`
3. **后端自动生成 mock openid**（`_id` 字段）并**存入数据库**
4. 后端创建完整虚拟用户对象（包含 `_id`, `username`, `avatar`, `isAdmin` 等）`

## 切换虚拟身份

**实现逻辑**（`store/userStore.js` 160-176行）：
- 更新 MobX 状态为虚拟用户信息：
  - MobX中 `userInfo = virtualUser`（包含虚拟 openid、昵称、头像等）
- **不写入 Storage**（虚拟身份不持久化）

**核心机制**：
- 虚拟身份完全等同于真实用户
- 所有 API 调用使用 MobX 中 `userStore.userInfo._id`（虚拟 openid）
- 所有页面显示使用 MobX 中 `userStore.userInfo`（昵称、头像）
- 因为程序中所有验证和交互都基于 MobX 数据，虚拟身份与真实身份行为完全一致

## 切换回真实身份

**触发时机**：
- 应用重新初始化（因为虚拟身份未存入 storage）
- 管理员手动点击切换回真实身份按钮

**实现逻辑**（`store/userStore.js` 179-185行）：
- **复用初始化登录函数** `checkLoginStatus()`
- 从 Storage 读取真实用户信息 → 更新 MobX 状态为真实用户

**核心原理**：
- Storage 中始终保存的是真实用户信息
- 切换回真实身份 = 从 Storage 恢复真实用户到 MobX

## 架构设计要点

### 数据隔离
- **Storage**：只存储真实用户信息
- **MobX**：存储当前激活身份（真实或虚拟）
- **虚拟身份不持久化**：应用重启自动恢复真实身份

### 无缝切换
因为所有接口和显示都使用 MobX 数据：
- 切换身份 = 更新 MobX 中的 `userInfo`
- 后端看到的是当前激活身份的 openid
- 页面显示的是当前激活身份的昵称和头像

## 相关文件

- **核心逻辑**：`store/userStore.js` 
  - `createVirtualUser()`：创建虚拟用户
  - `switchToVirtualIdentity()`：切换到虚拟身份
  - `switchToRealIdentity()`：切换回真实身份
- **API 定义**：`utils/api.js` 的 `admin` 对象
- **管理页面**：`pages/management/`

