# 用户动作权限管理

## 文件结构

```
config/actionPermissions.js           # 权限配置文件（9个状态 × 9个动作）
utils/checkUserActionPermission.js    # 核心逻辑（状态判断 + 权限检查）
```

## 动作列表（9个）

| 分类 | 动作 | 说明 |
|------|------|------|
| **页面访问** | `enterListPage` | 进入朋友圈列表页 |
| | `enterSettingsPage` | 进入设置页（需要是主人） |
| | `enterPublishPage` | 进入发布页 |
| **内容互动** | `likePost` | 点赞帖子 |
| | `commentPost` | 评论帖子 |
| | `publishPost` | 发布帖子 |
| **加入操作** | `acceptInvite` | 接受邀请 |
| | `applyToJoin` | 申请加入 |
| **全局操作** | `createCircle` | 创建朋友圈 |

## 状态枚举（9个）

基于真值表，完整且互斥：

| 状态 | 登录 | 成员 | 申请 | 邀请 | 公开 | 说明 |
|------|-----|-----|-----|-----|-----|------|
| `member` | ✅ | ✅ | - | - | - | 成员（含主人） |
| `applied` | ✅ | ❌ | ✅ | ❌ | - | 已申请等待审核 |
| `invited_applied` | ✅ | ❌ | ✅ | ✅ | - | 既申请又被邀请 |
| `invited` | ✅ | ❌ | ❌ | ✅ | - | 被邀请未申请 |
| `can_apply` | ✅ | ❌ | ❌ | ❌ | ✅ | 可申请（公开圈） |
| `no_access` | ✅ | ❌ | ❌ | ❌ | ❌ | 无权访问（私密圈） |
| `guest_invited` | ❌ | - | - | ✅ | - | 未登录+被邀请 |
| `guest_can_apply` | ❌ | - | - | ❌ | ✅ | 未登录+公开圈 |
| `guest_no_access` | ❌ | - | - | ❌ | ❌ | 未登录+私密圈 |

**状态判断优先级**（决策树）：
```
1. 未登录？
   └─> 有邀请码？→ guest_invited
   └─> 公开？→ guest_can_apply
   └─> guest_no_access

2. 已登录 + 成员？→ member

3. 已登录 + 非成员
   └─> 有邀请码 + 已申请？→ invited_applied  （邀请优先）
   └─> 有邀请码？→ invited
   └─> 已申请？→ applied
   └─> 公开？→ can_apply
   └─> no_access
```

## 配置结构

每个状态包含 5 个配置项：

```javascript
{
  permissions: {
    likePost: true,           // 是否允许（true/false）
    // ... 其他 8 个动作
  },
  
  rejectMessages: {
    likePost: '请先加入朋友圈才能点赞',  // 拒绝时的提示
    // ... 其他动作（仅配置需要提示的）
  },
  
  saveIntent: ['acceptInvite', 'applyToJoin'],  // 需要保存意图的动作列表
  
  rejectAction: 'showToast',  // 拒绝处理方式：'showRegisterPopup' | 'showToast'
  // 'showRegisterPopup': 弹出注册框（未登录用户）
  // 'showToast': 显示 Toast（已登录用户，默认）
  
  uiConfig: {                 // circle-status-action 组件 UI 配置
    show: true,
    mainTitle: '发布新动态',
    subTitle: '分享你的精彩瞬间',
    button: { text: '发布', action: 'publish', type: 'button', disabled: false }
  }
}
```

## 核心函数

### 1. getUserStatus()

**获取用户状态（轻量）**

```javascript
const status = getUserStatus(circle, userId, inviteCode);
// 返回：9种状态之一
```

**用途**：权限检查内部使用，只返回状态字符串。

**参数**：
- `circle`：朋友圈对象（必需）
- `userId`：用户ID（可选，未登录为 `null`，未传则自动获取）
- `inviteCode`：邀请码（可选，默认 `''`）

**注意**：函数内部会自动从 `inviteCode` 判断是否为邀请模式（`!!inviteCode`）

### 2. getUserStatusWithRole()

**获取用户状态及角色（完整）**

```javascript
const { status, isOwner } = getUserStatusWithRole(circle, userId, inviteCode);
```

**用途**：UI 状态显示，返回状态 + 角色信息。

### 3. checkActionPermission()

**检查动作权限（详细结果）**

```javascript
const result = checkActionPermission('likePost', { 
  circle, 
  userId,        // 可选，未传则自动获取
  inviteCode     // 可选，有邀请码时传递
});

// 返回：
// {
//   allowed: true/false,        // 是否允许
//   status: 'member',           // 用户状态
//   message: '提示信息',         // 拒绝消息（allowed=false 时）
//   rejectAction: 'showToast',  // 拒绝处理方式
//   saveIntent: false,          // 是否需要保存意图
//   intentAction: 'likePost',   // 意图动作名
//   ...                         // 其他信息
// }
```

### 4. checkAndHandle()

**检查权限并自动处理拒绝（推荐）**

```javascript
const { circle, inviteCode } = this.data;

if (!checkAndHandle('likePost', { circle, inviteCode })) {
  return;  // checkAndHandle 内部已自动处理：弹框/Toast + 保存意图
}

// 执行点赞等真正动作
```

**自动处理逻辑**：
- `rejectAction = 'showRegisterPopup'` → 弹出注册框（未登录）
- `rejectAction = 'showToast'` → 显示 Toast 提示（已登录）
- 配置 `saveIntent` → 自动保存意图

### 5. getUIConfig()

**获取 UI 配置（用于组件渲染）**

```javascript
const uiConfig = getUIConfig(circle, userId, inviteCode);
// 返回：{ show, mainTitle, subTitle, button: { text, action, type, disabled } }
```

## 使用示例

### 点赞操作

```javascript
// pages/details/details.js
onLike() {
  const { circle, inviteCode } = this.data;
  
  // 一行代码，自动处理所有情况（包括邀请码验证）
  if (!checkAndHandle('likePost', { circle, inviteCode })) {
    return;
  }
  
  // 执行点赞逻辑
  this.performLike();
}
```

## 关键设计原则

✅ **配置与逻辑分离**：权限规则在配置文件，业务逻辑在代码中

✅ **状态驱动**：基于用户-朋友圈关系状态，而非零散的条件判断

✅ **完整枚举**：9个状态覆盖所有可能，避免遗漏和冲突

✅ **用户体验优先**：未登录自动弹注册框，已登录显示友好提示

✅ **意图保存**：注册后自动完成原操作，减少用户重复点击

