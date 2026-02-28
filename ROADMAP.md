# 产品路线图 & 开发记录

## 产品定位演变

### 第一套（version1，社交层）
私密关系间的生活状态分享，去除朋友圈的表演压力。情侣、亲密好友在小圈子里随心分享状态，无回复压力，多线程对话。

**核心问题**：双边冷启动——两个人都要愿意用才有意义，推广结构性困难。**无 AI。**

### 第二套（version2，AI 层）
AI 陪你分享生活。你发照片、记录日常，AI 作为陪伴者评论、回应，甚至主动发动态。

**核心优势**：单人即可用，无冷启动。盈利路径清晰（订阅制）。

---

## 战略决策（已定）

**彻底砍掉社交层，all in AI 陪伴。**

理由：
- 社交层的双边冷启动是结构性死局
- AI 陪伴解决了"谁来回应我"的问题
- 需求本质相同：被看见、被回应、无压力——只是把真人换成了 AI
- 订阅制变现路径明确，不依赖网络效应

**盈利押注**：成败取决于 AI agent 质量能否达到"真正让人觉得被理解"的水准。

---

## 新架构设计（待实现）

### 核心体验
- **单一时间轴**：用户和 AI 的全部历史，永远在那里
- **Place 而非 Stream**：用户有归属感，有所有权，知道内容被保存
- **无 thread 列表**（避免工具感），改用"故事/旅程"概念

### 页面结构
- **保留**：`details`（主界面，时间轴）、`publish-panel`、`onboarding-guide`、`post-item`、`ai-avatar`、`custom-navigation`
- **砍掉**：`main`、`list`、`management`、`setting`（设置迁移到侧边栏）
- **新增**：侧边栏/毛玻璃遮罩层（故事列表 + 设置入口）

### 侧边栏设计
- 复用 `discover-circle-card` 的 history mode 卡片（有标题、封面图、最近更新时间）
- 卡片底部改为显示 **AI 最近说的一句话**，而非成员列表
- 底部放"创建新故事"入口
- 简单设置项也放在这里
- 用户发几条帖子后，动画引导点击入口按钮，看到"你的内容已保存"

### 启动流程
- app 启动直接进 `details`，不再经过 `main`
- 有已有故事 → 直接加载最近的故事
- 全新用户 → 走 onboarding 流程

---

## Pending TODOs

### version2 遗留（onboarding 流程）
| # | 任务 | 说明 |
|---|---|---|
| #5 | onboarding 结束后的注册引导 | 发布后 showOnboarding=false，后续操作走 checkAndHandle → user-info-popup，带意图保存 |
| #6 | main 页 onShareAppMessage | 返回 onboarding 链接（pages/details/details?onboarding=true），专用标题和封面图 |
| #7 | 病毒传播分享组件 | 底部弹出，可复用，未来接入"分享后解锁"门控逻辑 |
| #8 | onboarding 分流逻辑 | 已注册用户→跳过；已有 trial 圈→引导回已有圈；全新用户→正常流程 |

### 新架构（AI-only 重构）
| # | 任务 | 说明 |
|---|---|---|
| A1 | 砍掉 main/list/management/setting 页面 | 清理路由和 app.json |
| A2 | details 顶部重设计 | 去掉成员/邀请/设置按钮，换成简洁标题 + 侧边栏入口 |
| A3 | 新建侧边栏组件 | 毛玻璃遮罩，复用 discover-circle-card history mode，底部创建入口 + 设置 |
| A4 | 修改卡片 history mode | 底部成员列表改为 AI 最近的一句话 |
| A5 | app 启动入口改造 | app.js onLaunch 直接跳 details，判断有无故事 |
| A6 | AI agent 开发 | 有 tool，能主动发动态，有记忆，真正理解用户——核心竞争力 |

---

## 技术架构记录

### Trial 匿名发布流程
1. 用户扫 onboarding 链接（`pages/details/details?onboarding=true`），无需登录
2. 点击"拍一张"直接拉起相机，图片预填充到 publish-panel
3. `POST /public/trial/circle` 自动创建 TempUser + 朋友圈
4. `POST /public/trial/post` 发布帖子
5. 前端拿到 circleId，关闭 onboarding，加载真实数据
6. 注册后 TempUser 自动迁移到正式用户，数据零损失

### openid 获取优先级
1. 已登录：`userStore.userInfo._id`
2. 未登录：`wx.getStorageSync('openid')`（微信登录时写入，一直存在）

### 测试模式
```javascript
getApp().devTools.startTestMode()   // 生成 test_xxx openid，切换到未注册状态
await getApp().devTools.endTestMode() // 清理后端数据，恢复真实身份
```
注意：`startTestMode()` 检测到已有 `test_` openid 会拒绝重新生成，需先 `endTestMode()`。

### 关键文件路径
- `utils/api.js` — 所有请求统一走 `request()`，自动注入 x-openid header
- `utils/animatedText.js` — `PER_CHAR_DELAY = 85`，AI 评论逐字动画速度
- `store/postStore.js` — `prependPost()` 用于 trial 发布后插入帖子
- `components/onboarding-guide/onboarding-guide.js` — `_startAnimation()` 仅首次调用
- `pages/details/details.js` — `_onboardingAnimationStarted` flag 防止相机返回重置动画
