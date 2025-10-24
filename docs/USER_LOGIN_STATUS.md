# 用户状态管理逻辑

## 核心身份标识：OpenID

应用启动时（`app.js` → `initializeApp()`）会调用 `getOpenid()` 函数：
- 优先从本地 `storage` 读取（key: `'openid'`）
- 如果没有，通过微信登录获取 code，调用后端 `/wechat/get-openid` 换取
- 获取后存入本地 storage
- **OpenID 是用户的核心 identity，应用中始终有效**

## 用户信息结构

Storage 中的 `userInfo` 对象包含（后端返回的完整用户数据）：
- `_id`：用户ID（**等同于 openid 值**）
- `username`：用户昵称
- `avatar`：用户头像
- `isAdmin`：是否管理员
- 其他后端返回的字段

## 初始化流程

**调用链：**
```
app.js: onLaunch() 
  - 小程序启动入口
  
  └─> initializeApp() (107-121行)
      - 应用初始化统一入口
      
      └─> userStore.initializeFromStorage() (store/userStore.js 65-93行)
          - 从 Storage 初始化 MobX 用户状态
          
          └─> auth.initUserAuthInStorage() (utils/auth.js 70-136行)
              - 确保 Storage 中有用户认证信息：优先读取本地 Storage，没有则用 OpenID 从后端获取并存入
              - 返回登录状态和用户信息
              
              └─> auth.getOpenid() (utils/auth.js 30-68行)
                  - 获取 OpenID（优先本地，否则从后端获取）
                  - 确保应用中始终有 OpenID
```

**检查逻辑（`utils/auth.js` 的 `initUserAuthInStorage` 函数）：**

1. **获取 OpenID**（确保缓存）

2. **检查本地 Storage**
   - 读取 `userInfo`
   - 如果包含 `username` && `avatar` && `_id` → 直接返回 **已登录状态**
   - **无需通过后端验证有效性**（因为暂不支持修改昵称/头像）

3. **本地无数据时，调用后端**
   - 请求：`POST /wechat/get-user-info`，参数 `{ openid }`

4. **后端返回完整信息**
   - 如果 `username` && `avatar` 都有值：
     - 存入本地 storage
     - 设置 MobX 状态为 `loggedIn`
     - 用户昵称和头像显示在页面

5. **后端返回空信息**
   - 如果 `username` 和 `avatar` 都为空：
     - 用户标记为 `unregistered` 状态
     - 不存储到 storage

## 数据访问规则 ✅

**重点：Storage 仅用于初始化，运行时完全依赖 MobX**

- **Storage 的 `userInfo`**：
  - 仅在应用初始化时读取一次
  - 只有真实身份状态变更时，才通过 `_syncToStorage()` 写回

- **运行时所有业务逻辑完全依赖 MobX 数据**：
  - 所有接口和显示都使用 MobX 数据：
  - 后端看到的是当前激活身份的 openid
  - 页面显示的是当前激活身份的昵称和头像

- **状态同步原则**：
  - **后端 → Storage**（唯一写入来源）：
    - ✅ **初始化认证**：`auth.initUserAuthInStorage()` 第117行
      - 后端返回用户信息 → 直接写入 storage → 返回给 MobX
    - ✅ **用户注册**：`user-info-popup.js` 第257行
      - 注册成功，后端返回数据 → 直接写入 storage → 更新 MobX
  
  - **Storage → MobX**（初始化时）：
    - 应用启动时，从 storage 读取 `userInfo` → 更新到 MobX
    - 位置：`userStore.initializeFromStorage()` → `auth.initUserAuthInStorage()`
  
  - **MobX 不写入 Storage**：
    - MobX 中的状态变更（如虚拟身份切换、临时更新）**不会**写回 storage
    - Storage 数据永远来自后端，保证数据权威性

## 状态管理文件位置

- **核心逻辑**：`utils/auth.js`
- **状态管理**：`store/userStore.js`
- **应用入口**：`app.js`

