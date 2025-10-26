# 测试系统概览

## 已完成的基础测试用例

### 1. `test_login.py` - 用户登录测试

**流程**：
1. 启动小程序，进入测试模式
2. 点击登录按钮，触发注册弹窗
3. 填写用户信息（头像、昵称）
4. 验证登录成功
5. 退出测试模式并清理数据

### 2. `test_unlogged.py` - 未登录用户测试

**测试场景**（Main 页面）：
- **MAIN_001**: 点击"点击登录"按钮 → 验证弹窗提示"请完善您的个人信息"
- **MAIN_002**: 点击历史记录 → 验证弹窗提示"您需要登录才能查看朋友圈列表"
- **MAIN_003**: 点击创建新朋友圈 → 验证弹窗提示"您需要登录才能创建朋友圈"
- **MAIN_004**: 刷新"发现有趣朋友圈"
- **MAIN_005**: 进入有趣朋友圈（浏览模式）→ 验证不同状态下的操作权限和提示文字

**每个测试验证**：
- 操作触发正确的行为
- 弹窗显示正确的提示文字

### 3. `test_complete_user_flow.py` - 完整用户流程测试

**流程**（13步）：
1. 用户登录
2. 创建新朋友圈
3. 发帖子（带图片）
4. 对帖子点赞
5. 对帖子评论
6. 回复评论
7. 删除一条评论
8. 取消点赞
9. 删除帖子
10. 发布包含三张图片的帖子
11. 返回首页
12. 验证所有操作结果
13. 退出测试模式（teardown）

---

## 用户动作权限测试用例（新增）

### 测试目标
全面测试用户在9种状态下对9个动作的权限控制，包括权限验证、提示信息、意图保存、多用户交互和状态转换。

### 核心测试维度
- **9种用户状态**：member, applied, invited_applied, invited, can_apply, no_access, guest_invited, guest_can_apply, guest_no_access
- **9个用户动作**：enterListPage, enterSettingsPage, enterPublishPage, likePost, commentPost, publishPost, acceptInvite, applyToJoin, createCircle
- **权限配置验证**：允许/拒绝、提示信息、拒绝处理方式（Toast/注册弹窗）
- **意图保存验证**：注册后自动执行原意图
- **状态转换验证**：申请加入、接受邀请、审核通过等状态流转

---

## 4. 未登录用户权限测试

> **说明**：本节测试内容与 `tests/test_cases/test_unlogged.py` 协同设计
> - `test_unlogged.py` 已覆盖：Main页面操作、Details页面基础权限弹窗（点赞/评论/设置等）、状态组件验证
> - 本节重点测试：注册后自动执行意图的完整流程（申请加入、接受邀请）

### 4.1 `test_guest_can_apply_state` - 未登录访问公开朋友圈（完整流程）

**测试状态**：guest_can_apply → applied（未登录 → 注册 → 申请）

**前置条件**：
- 步骤1：确保用户未登录
- 步骤2：用户A登录并创建公开朋友圈（isPublic=true）
- 步骤3：用户A发布2个帖子
- 步骤4：用户A退出登录

**测试步骤**：
- 步骤5：未登录用户通过普通链接进入公开朋友圈详情页
- 步骤6：验证UI配置：
  - show = true
  - mainTitle = "公开朋友圈"
  - subTitle = "你可以申请加入这个朋友圈"
  - button.text = "申请加入"
  - button.action = "apply"
  - button.type = "button"
  - button.disabled = false
- 步骤7：点击"申请加入"按钮
  - 验证：弹出注册弹窗
  - 验证：提示信息 = "请先完成注册后提交申请"
  - 验证：保存意图（saveIntent包含applyToJoin）
- 步骤8：在注册弹窗中填写用户信息完成注册
  - 验证：注册成功后自动执行申请加入操作
  - 验证：Toast提示"申请已提交"或类似信息
  - 验证：用户状态从guest_can_apply转换为applied
  - 验证：UI更新为applied状态（按钮文字="审核中"，disabled=true）

**清理步骤**：
- 步骤9：删除测试用户、朋友圈和帖子

**注**：circle-status-action 状态验证已由 `test_unlogged.py` (DETAILS_001) 覆盖

### 4.2 `test_guest_invited_state` - 未登录通过邀请链接访问（完整流程）

**测试状态**：guest_invited → member（未登录 → 注册 → 自动加入）

**前置条件**：
- 步骤1：确保用户未登录
- 步骤2：用户A登录并创建私密朋友圈（isPublic=false）
- 步骤3：用户A发布1个帖子
- 步骤4：用户A生成邀请链接
- 步骤5：用户A退出登录

**测试步骤**：
- 步骤6：未登录用户通过邀请链接进入朋友圈详情页（isInviteMode=true）
- 步骤7：验证UI配置：
  - show = true
  - mainTitle = "你收到了邀请"
  - subTitle = "点击右侧按钮加入这个朋友圈"
  - button.text = "接受邀请"
  - button.action = "acceptInvite"
  - button.type = "button"
  - button.disabled = false
- 步骤8：点击"接受邀请"按钮
  - 验证：弹出注册弹窗
  - 验证：保存意图（saveIntent包含acceptInvite）
- 步骤9：在注册弹窗中填写用户信息完成注册
  - 验证：注册成功后自动执行接受邀请操作
  - 验证：自动加入朋友圈（无需审核）
  - 验证：用户状态从guest_invited转换为member
  - 验证：UI更新为member状态（按钮文字="发布"）
- 步骤10：验证现在可以点赞和评论帖子（member权限）
  - 尝试点赞：应该成功，不弹窗
  - 尝试评论：应该成功，不弹窗

**清理步骤**：
- 步骤11：删除测试用户、朋友圈和帖子

**注**：circle-status-action 状态验证已由 `test_unlogged.py` (DETAILS_005) 覆盖

---

## 5. 已登录用户权限测试

### 5.1 `test_member_state` - 成员权限测试

**测试状态**：member（已登录 + 已是成员）

**前置条件**：
- 步骤1：用户A登录并创建朋友圈
- 步骤2：用户A发布2个帖子
- 步骤3：确认用户A是成员（isMember=true）

**测试步骤**：
- 步骤4：验证UI配置：
  - show = true
  - mainTitle = "发布新动态"
  - subTitle = "分享你的精彩瞬间"
  - button.text = "发布"
  - button.action = "publish"
  - button.type = "static"
- 步骤5：验证允许的动作（permissions=true）：
  - enterListPage：成功进入列表页
  - enterSettingsPage：成功进入设置页
  - enterPublishPage：成功进入发布页
  - likePost：成功点赞帖子
  - commentPost：成功评论帖子
  - publishPost：成功发布新帖子
  - createCircle：可以创建新的朋友圈
- 步骤6：验证拒绝的动作（permissions=false）：
  - acceptInvite：操作被拒绝，Toast提示 = "您已是成员"
  - applyToJoin：操作被拒绝，Toast提示 = "您已是成员"
- 步骤7：验证所有拒绝动作使用Toast方式（rejectAction=showToast）

**清理步骤**：
- 步骤8：删除测试朋友圈和帖子

### 5.2 `test_owner_specific_permissions` - 主人特殊权限测试

**测试状态**：member + isOwner=true

**前置条件**：
- 步骤1：用户A登录并创建朋友圈
- 步骤2：用户A发布1个帖子
- 步骤3：用户B登录并申请加入朋友圈
- 步骤4：切换回用户A（主人）

**测试步骤**：
- 步骤5：验证主人可以进入设置页（enterSettingsPage权限）
- 步骤6：在设置页中验证主人可以：
  - 修改朋友圈名称
  - 修改朋友圈描述
  - 切换公开/私密状态
  - 审核用户B的申请（通过/拒绝）
  - 查看成员列表
  - 移除成员
  - 生成邀请链接
- 步骤7：审核通过用户B的申请
- 步骤8：验证用户B成为成员

**清理步骤**：
- 步骤9：删除测试用户、朋友圈和帖子

### 5.3 `test_applied_state` - 已申请等待审核状态

**测试状态**：applied（已登录 + 已申请等待审核）

**前置条件**：
- 步骤1：用户A登录并创建公开朋友圈（isPublic=true）
- 步骤2：用户A发布2个帖子
- 步骤3：用户A退出登录
- 步骤4：用户B登录
- 步骤5：用户B访问朋友圈并申请加入
- 步骤6：确认用户B处于applied状态（hasApplied=true）

**测试步骤**：
- 步骤7：验证UI配置：
  - show = true
  - mainTitle = "申请已提交"
  - subTitle = "等待朋友圈主人审核中"
  - button.text = "审核中"
  - button.disabled = true
  - button.type = "static"
- 步骤8：验证允许的动作：
  - enterListPage：可以进入列表页
  - enterPublishPage：可以进入发布页（但无法发布）
  - createCircle：可以创建新朋友圈
- 步骤9：验证拒绝的动作（Toast提示）：
  - enterSettingsPage：Toast = "只有朋友圈成员可以修改设置"
  - likePost：Toast = "请先加入朋友圈才能点赞"
  - commentPost：Toast = "请先加入朋友圈才能评论"
  - publishPost：Toast = "请先加入朋友圈才能发布动态"
  - acceptInvite：Toast = "您已申请，请等待审核"
  - applyToJoin：Toast = "您已申请，请等待审核"
- 步骤10：验证所有拒绝使用Toast方式（rejectAction=showToast）
- 步骤11：验证不保存意图（saveIntent=[]）

**清理步骤**：
- 步骤12：删除测试用户、朋友圈和帖子

### 5.4 `test_invited_state` - 被邀请状态

**测试状态**：invited（已登录 + 被邀请但未申请）

**前置条件**：
- 步骤1：用户A登录并创建私密朋友圈
- 步骤2：用户A发布2个帖子
- 步骤3：用户A生成邀请链接
- 步骤4：用户A退出登录
- 步骤5：用户B登录
- 步骤6：用户B通过邀请链接访问朋友圈（isInviteMode=true）

**测试步骤**：
- 步骤7：验证UI配置：
  - show = true
  - mainTitle = "你收到了邀请"
  - subTitle = "点击右侧按钮加入这个朋友圈"
  - button.text = "接受邀请"
  - button.action = "acceptInvite"
  - button.type = "button"
  - button.disabled = false
- 步骤8：验证允许的动作：
  - enterListPage：可以进入列表页
  - enterPublishPage：可以进入发布页（但无法发布）
  - acceptInvite：可以接受邀请
  - createCircle：可以创建新朋友圈
- 步骤9：验证拒绝的动作（Toast提示）：
  - enterSettingsPage：Toast = "只有朋友圈成员可以修改设置"
  - likePost：Toast = "请先加入朋友圈才能点赞"
  - commentPost：Toast = "请先加入朋友圈才能评论"
  - publishPost：Toast = "请先加入朋友圈才能发布动态"
  - applyToJoin：Toast = "您已有邀请，可直接接受"
- 步骤10：点击"接受邀请"按钮
  - 验证：成功加入朋友圈（无需审核）
  - 验证：状态从invited转换为member
  - 验证：UI更新为member状态
- 步骤11：验证现在拥有member的所有权限（可点赞、评论、发布）

**清理步骤**：
- 步骤12：删除测试用户、朋友圈和帖子

### 5.5 `test_invited_applied_state` - 既申请又被邀请状态

**测试状态**：invited_applied（已登录 + 既申请又被邀请，邀请优先）

**前置条件**：
- 步骤1：用户A登录并创建公开朋友圈
- 步骤2：用户A发布1个帖子
- 步骤3：用户A退出登录
- 步骤4：用户B登录并访问朋友圈
- 步骤5：用户B通过普通链接申请加入（applied状态）
- 步骤6：用户B退出登录
- 步骤7：用户A登录并生成邀请链接
- 步骤8：用户A退出登录
- 步骤9：用户B登录
- 步骤10：用户B通过邀请链接访问朋友圈（isInviteMode=true + hasApplied=true）

**测试步骤**：
- 步骤11：验证UI配置（邀请优先于申请）：
  - show = true
  - mainTitle = "你收到了邀请"
  - subTitle = "点击右侧按钮可直接加入（无需等待审核）"
  - button.text = "接受邀请"
  - button.action = "acceptInvite"
  - button.type = "button"
  - button.disabled = false
- 步骤12：验证允许的动作：
  - enterListPage：可以进入列表页
  - enterPublishPage：可以进入发布页
  - acceptInvite：可以接受邀请
  - createCircle：可以创建新朋友圈
- 步骤13：验证拒绝的动作：
  - enterSettingsPage：Toast = "只有朋友圈成员可以修改设置"
  - likePost：Toast = "请先加入朋友圈才能点赞"
  - commentPost：Toast = "请先加入朋友圈才能评论"
  - publishPost：Toast = "请先加入朋友圈才能发布动态"
  - applyToJoin：Toast = "您已有邀请，可直接接受"
- 步骤14：验证保存意图配置（saveIntent=['acceptInvite']）
- 步骤15：点击"接受邀请"按钮
  - 验证：成功加入朋友圈
  - 验证：状态从invited_applied转换为member
  - 验证：之前的申请自动失效或被清除
  - 验证：UI更新为member状态

**清理步骤**：
- 步骤16：删除测试用户、朋友圈和帖子

### 5.6 `test_can_apply_state` - 可申请状态

**测试状态**：can_apply（已登录 + 公开朋友圈 + 未申请）

**前置条件**：
- 步骤1：用户A登录并创建公开朋友圈（isPublic=true）
- 步骤2：用户A发布2个帖子
- 步骤3：用户A退出登录
- 步骤4：用户B登录
- 步骤5：用户B通过普通链接访问朋友圈

**测试步骤**：
- 步骤6：验证UI配置：
  - show = true
  - mainTitle = "公开朋友圈"
  - subTitle = "你可以申请加入这个朋友圈"
  - button.text = "申请加入"
  - button.action = "apply"
  - button.type = "button"
  - button.disabled = false
- 步骤7：验证允许的动作：
  - enterListPage：可以进入列表页
  - enterPublishPage：可以进入发布页
  - applyToJoin：可以申请加入
  - createCircle：可以创建新朋友圈
- 步骤8：验证拒绝的动作：
  - enterSettingsPage：Toast = "只有朋友圈成员可以修改设置"
  - likePost：Toast = "请先加入朋友圈才能点赞"
  - commentPost：Toast = "请先加入朋友圈才能评论"
  - publishPost：Toast = "请先加入朋友圈才能发布动态"
  - acceptInvite：Toast = "这不是邀请链接"
- 步骤9：点击"申请加入"按钮
  - 验证：申请提交成功
  - 验证：Toast提示"申请已提交"或类似信息
  - 验证：状态从can_apply转换为applied
  - 验证：UI更新为applied状态（button.text="审核中", disabled=true）
- 步骤10：尝试再次申请
  - 验证：Toast = "您已申请，请等待审核"

**清理步骤**：
- 步骤11：删除测试用户、朋友圈和帖子

### 5.7 `test_no_access_state` - 无权访问状态

**测试状态**：no_access（已登录 + 私密朋友圈 + 无邀请无申请）

**前置条件**：
- 步骤1：用户A登录并创建私密朋友圈（isPublic=false）
- 步骤2：用户A发布1个帖子
- 步骤3：用户A退出登录
- 步骤4：用户B登录
- 步骤5：用户B通过普通链接访问朋友圈

**测试步骤**：
- 步骤6：验证UI配置：
  - show = true
  - mainTitle = "无法访问"
  - subTitle = "无权查看此朋友圈"
  - button.text = "无权限"
  - button.action = null
  - button.type = "static"
  - button.disabled = true
- 步骤7：验证只允许的动作：
  - enterListPage：可以进入列表页
  - enterPublishPage：可以进入发布页
  - createCircle：可以创建新朋友圈
- 步骤8：验证拒绝的所有其他动作（Toast提示）：
  - enterSettingsPage：Toast = "只有朋友圈成员可以修改设置"
  - likePost：Toast = "请先加入朋友圈才能点赞"
  - commentPost：Toast = "请先加入朋友圈才能评论"
  - publishPost：Toast = "请先加入朋友圈才能发布动态"
  - acceptInvite：Toast = "这不是邀请链接"
  - applyToJoin：Toast = "这是私密朋友圈"
- 步骤9：验证不保存意图（saveIntent=[]）

**清理步骤**：
- 步骤10：删除测试用户、朋友圈和帖子

---

## 6. 状态转换流程测试

### 6.1 `test_state_transition_apply_to_member` - 申请到成员的状态转换

**测试场景**：can_apply → applied → member

**前置条件**：
- 步骤1：用户A登录并创建公开朋友圈
- 步骤2：用户A发布1个帖子
- 步骤3：用户A退出登录

**测试步骤**：
- 步骤4：用户B登录并访问朋友圈
- 步骤5：验证初始状态为can_apply
  - 验证：UI显示"申请加入"按钮
- 步骤6：用户B点击"申请加入"
  - 验证：状态转换为applied
  - 验证：UI更新为"审核中"
  - 验证：无法点赞、评论、发布
- 步骤7：用户B退出登录
- 步骤8：用户A登录并进入设置页
- 步骤9：用户A审核通过用户B的申请
  - 验证：用户B被添加到成员列表
- 步骤10：用户A退出登录
- 步骤11：用户B登录并访问朋友圈
  - 验证：状态转换为member
  - 验证：UI显示"发布"按钮
  - 验证：可以点赞、评论、发布帖子
- 步骤12：用户B尝试接受邀请或申请加入
  - 验证：Toast = "您已是成员"

**清理步骤**：
- 步骤13：删除测试用户、朋友圈和帖子

### 6.2 `test_state_transition_invite_to_member` - 邀请到成员的状态转换

**测试场景**：guest_invited → invited → member

**前置条件**：
- 步骤1：用户A登录并创建私密朋友圈
- 步骤2：用户A发布1个帖子
- 步骤3：用户A生成邀请链接
- 步骤4：用户A退出登录

**测试步骤**：
- 步骤5：未登录用户通过邀请链接访问
- 步骤6：验证状态为guest_invited
  - 验证：UI显示"接受邀请"按钮
- 步骤7：点击"接受邀请"触发注册
- 步骤8：完成注册创建用户B
  - 验证：意图被保存（acceptInvite）
  - 验证：注册成功后自动接受邀请
  - 验证：状态直接转换为member
  - 验证：UI更新为"发布"按钮
  - 验证：可以点赞、评论、发布帖子

**清理步骤**：
- 步骤9：删除测试用户、朋友圈和帖子

### 6.3 `test_state_transition_complex_flow` - 复杂状态转换流程

**测试场景**：can_apply → applied → invited_applied → member

**前置条件**：
- 步骤1：用户A登录并创建公开朋友圈
- 步骤2：用户A发布1个帖子

**测试步骤**：
- 步骤3：用户B登录并通过普通链接访问
  - 验证：状态 = can_apply
- 步骤4：用户B申请加入
  - 验证：状态转换为applied
  - 验证：UI = "审核中"
- 步骤5：用户B退出登录
- 步骤6：用户A生成邀请链接
- 步骤7：用户B登录并通过邀请链接访问
  - 验证：状态转换为invited_applied（邀请优先）
  - 验证：UI = "接受邀请"（可直接加入，无需等待审核）
  - 验证：subTitle提示无需等待审核
- 步骤8：用户B点击"接受邀请"
  - 验证：状态转换为member
  - 验证：之前的申请失效
  - 验证：可以点赞、评论、发布

**清理步骤**：
- 步骤9：删除测试用户、朋友圈和帖子

---

## 7. 多用户交互测试

### 7.1 `test_multi_user_invite_flow` - 多用户邀请流程

**测试场景**：主人邀请多个用户，验证各自状态独立

**前置条件**：
- 步骤1：用户A登录并创建私密朋友圈
- 步骤2：用户A发布1个帖子

**测试步骤**：
- 步骤3：用户A生成邀请链接1
- 步骤4：用户A退出登录
- 步骤5：用户B通过邀请链接1访问
  - 验证：用户B状态 = guest_invited
  - 验证：UI显示"接受邀请"
- 步骤6：用户B完成注册并接受邀请
  - 验证：用户B状态 = member
- 步骤7：用户B退出登录
- 步骤8：用户A登录
- 步骤9：用户A生成邀请链接2
- 步骤10：用户A退出登录
- 步骤11：用户C通过邀请链接2访问
  - 验证：用户C状态 = guest_invited
  - 验证：用户C看到的UI与用户B相同
- 步骤12：用户C不接受邀请，退出
- 步骤13：用户B登录并访问朋友圈
  - 验证：用户B仍然是member状态
  - 验证：用户B可以正常点赞、评论
- 步骤14：验证用户C的邀请状态未影响用户B

**清理步骤**：
- 步骤15：删除测试用户、朋友圈和帖子

### 7.2 `test_multi_user_apply_flow` - 多用户申请流程

**测试场景**：多用户申请加入，主人依次审核

**前置条件**：
- 步骤1：用户A登录并创建公开朋友圈
- 步骤2：用户A发布1个帖子
- 步骤3：用户A退出登录

**测试步骤**：
- 步骤4：用户B登录并申请加入
  - 验证：用户B状态 = applied
- 步骤5：用户B退出登录
- 步骤6：用户C登录并申请加入
  - 验证：用户C状态 = applied
- 步骤7：用户C退出登录
- 步骤8：用户D登录并申请加入
  - 验证：用户D状态 = applied
- 步骤9：用户D退出登录
- 步骤10：用户A登录并进入设置页
- 步骤11：验证申请列表包含用户B、C、D
- 步骤12：用户A审核通过用户B
  - 验证：用户B被添加到成员列表
- 步骤13：用户A审核拒绝用户C
  - 验证：用户C的申请被移除
- 步骤14：用户A退出登录
- 步骤15：用户B登录并访问朋友圈
  - 验证：用户B状态 = member
  - 验证：可以点赞、评论
- 步骤16：用户B退出登录
- 步骤17：用户C登录并访问朋友圈
  - 验证：用户C状态 = can_apply（申请被拒后重置）
  - 验证：可以重新申请
- 步骤18：用户C退出登录
- 步骤19：用户D登录并访问朋友圈
  - 验证：用户D状态 = applied（未被审核）
  - 验证：UI = "审核中"

**清理步骤**：
- 步骤20：删除测试用户、朋友圈和帖子

### 7.3 `test_member_permission_variations` - 成员权限差异测试

**测试场景**：主人与普通成员的权限差异

**前置条件**：
- 步骤1：用户A登录并创建朋友圈（allowInvite=false）
- 步骤2：用户A添加用户B为成员
- 步骤3：用户A发布1个帖子
- 步骤4：用户B发布1个帖子

**测试步骤**：
- 步骤5：用户A（主人）进入设置页
  - 验证：可以访问（enterSettingsPage权限）
  - 验证：可以修改朋友圈设置
  - 验证：可以审核申请
  - 验证：可以管理成员
  - 验证：可以生成邀请链接
- 步骤6：用户A退出登录
- 步骤7：用户B（普通成员）尝试进入设置页
  - 验证：权限检查返回allowed=true（成员都可以进入）
  - 验证：但UI中只能修改个人相关设置（前端限制）
- 步骤8：用户B尝试分享朋友圈（canShareCircle）
  - 验证：返回false（allowInvite=false）
  - 验证：分享按钮不可见或禁用
- 步骤9：用户B退出登录
- 步骤10：用户A登录并修改设置（allowInvite=true）
- 步骤11：用户A退出登录
- 步骤12：用户B登录并访问朋友圈
- 步骤13：用户B尝试分享朋友圈
  - 验证：返回true（allowInvite=true）
  - 验证：可以生成邀请链接
- 步骤14：验证用户B生成的邀请链接有效
- 步骤15：用户C通过用户B生成的邀请链接访问
  - 验证：状态 = guest_invited
  - 验证：可以接受邀请加入

**清理步骤**：
- 步骤16：删除测试用户、朋友圈和帖子

---

## 8. 意图保存功能测试

### 8.1 `test_intent_save_accept_invite` - 接受邀请意图保存

**测试场景**：未登录用户点击接受邀请，注册后自动执行

**前置条件**：
- 步骤1：用户A登录并创建私密朋友圈
- 步骤2：用户A生成邀请链接
- 步骤3：用户A退出登录

**测试步骤**：
- 步骤4：未登录用户通过邀请链接访问
  - 验证：状态 = guest_invited
- 步骤5：点击"接受邀请"按钮
  - 验证：弹出注册弹窗
  - 验证：意图被保存（type=acceptInvite, circleId=朋友圈ID）
- 步骤6：用户关闭弹窗
- 步骤7：验证意图仍然保存在本地存储中
- 步骤8：用户重新点击"接受邀请"
  - 验证：再次弹出注册弹窗
- 步骤9：用户填写信息完成注册（创建用户B）
  - 验证：注册成功后自动检测到保存的意图
  - 验证：自动调用acceptInvite接口
  - 验证：成功加入朋友圈
  - 验证：状态转换为member
  - 验证：意图被清除
- 步骤10：用户B刷新页面
  - 验证：仍然是member状态
  - 验证：不会重复执行意图

**清理步骤**：
- 步骤11：删除测试用户、朋友圈

### 8.2 `test_intent_save_apply_to_join` - 申请加入意图保存

**测试场景**：未登录用户点击申请加入，注册后自动执行

**前置条件**：
- 步骤1：用户A登录并创建公开朋友圈
- 步骤2：用户A发布1个帖子
- 步骤3：用户A退出登录

**测试步骤**：
- 步骤4：未登录用户通过普通链接访问
  - 验证：状态 = guest_can_apply
- 步骤5：点击"申请加入"按钮
  - 验证：弹出注册弹窗
  - 验证：意图被保存（type=applyToJoin, circleId=朋友圈ID）
- 步骤6：用户填写信息完成注册（创建用户B）
  - 验证：注册成功后自动调用applyToJoin接口
  - 验证：申请提交成功
  - 验证：状态转换为applied
  - 验证：UI更新为"审核中"
  - 验证：意图被清除

**清理步骤**：
- 步骤7：删除测试用户、朋友圈

### 8.3 `test_intent_save_edge_cases` - 意图保存边界情况

**测试场景**：验证意图保存的各种边界情况

**测试步骤**：

**场景1：多次触发保存意图**
- 步骤1：未登录用户访问公开朋友圈
- 步骤2：点击"申请加入"，关闭弹窗
- 步骤3：再次点击"申请加入"，关闭弹窗
- 步骤4：验证：只保存最新的一个意图
- 步骤5：完成注册，验证只执行一次申请

**场景2：切换不同朋友圈的意图**
- 步骤6：创建朋友圈A和朋友圈B（公开）
- 步骤7：未登录用户访问朋友圈A，点击"申请加入"
- 步骤8：访问朋友圈B，点击"申请加入"
- 步骤9：验证：意图被更新为朋友圈B
- 步骤10：完成注册，验证只申请加入朋友圈B

**场景3：意图类型切换**
- 步骤11：创建公开朋友圈C和私密朋友圈D（带邀请链接）
- 步骤12：未登录用户访问朋友圈C，点击"申请加入"（保存applyToJoin意图）
- 步骤13：访问朋友圈D邀请链接，点击"接受邀请"（保存acceptInvite意图）
- 步骤14：验证：意图被更新为acceptInvite + 朋友圈D
- 步骤15：完成注册，验证接受邀请加入朋友圈D，未申请朋友圈C

**场景4：意图保存但朋友圈被删除**
- 步骤16：创建朋友圈E
- 步骤17：未登录用户访问并保存意图
- 步骤18：删除朋友圈E
- 步骤19：用户完成注册
- 步骤20：验证：意图执行失败，返回友好错误提示
- 步骤21：验证：不影响用户正常使用

**场景5：无需保存意图的动作**
- 步骤22：未登录用户访问朋友圈，尝试点赞
- 步骤23：验证：弹出注册弹窗
- 步骤24：验证：意图未被保存（likePost不在saveIntent列表中）
- 步骤25：完成注册，验证：不自动执行点赞
- 步骤26：验证：用户需要手动点赞

**清理步骤**：
- 步骤27：删除所有测试数据

---

## 9. UI配置验证测试

### 9.1 `test_ui_config_all_states` - 所有状态的UI配置验证

**测试目标**：验证9种状态下circle-status-action组件的UI配置正确性

**测试步骤**：

**验证member状态UI**：
- 步骤1：创建朋友圈，用户A作为成员访问
- 步骤2：调用getUIConfig()
- 步骤3：验证返回值：
  - show = true
  - mainTitle = "发布新动态"
  - subTitle = "分享你的精彩瞬间"
  - button.text = "发布"
  - button.action = "publish"
  - button.type = "static"
  - button.disabled = false

**验证applied状态UI**：
- 步骤4：用户B申请加入
- 步骤5：验证UI配置：
  - mainTitle = "申请已提交"
  - subTitle = "等待朋友圈主人审核中"
  - button.text = "审核中"
  - button.disabled = true
  - button.type = "static"

**验证invited状态UI**：
- 步骤6：用户C通过邀请链接访问
- 步骤7：验证UI配置：
  - mainTitle = "你收到了邀请"
  - subTitle = "点击右侧按钮加入这个朋友圈"
  - button.text = "接受邀请"
  - button.action = "acceptInvite"
  - button.type = "button"
  - button.disabled = false

**验证invited_applied状态UI**：
- 步骤8：用户D先申请，再通过邀请链接访问
- 步骤9：验证UI配置：
  - mainTitle = "你收到了邀请"
  - subTitle = "点击右侧按钮可直接加入（无需等待审核）"
  - button.text = "接受邀请"
  - button.action = "acceptInvite"

**验证can_apply状态UI**：
- 步骤10：用户E访问公开朋友圈
- 步骤11：验证UI配置：
  - mainTitle = "公开朋友圈"
  - subTitle = "你可以申请加入这个朋友圈"
  - button.text = "申请加入"
  - button.action = "apply"

**验证no_access状态UI**：
- 步骤12：用户F访问私密朋友圈（无邀请）
- 步骤13：验证UI配置：
  - mainTitle = "无法访问"
  - subTitle = "无权查看此朋友圈"
  - button.text = "无权限"
  - button.action = null
  - button.disabled = true

**验证guest_invited状态UI**：
- 步骤14：未登录用户通过邀请链接访问
- 步骤15：验证UI配置与invited状态相同

**验证guest_can_apply状态UI**：
- 步骤16：未登录用户访问公开朋友圈
- 步骤17：验证UI配置与can_apply状态相同

**验证guest_no_access状态UI**：
- 步骤18：未登录用户访问私密朋友圈
- 步骤19：验证UI配置：
  - show = false（组件不显示）

**清理步骤**：
- 步骤20：删除测试数据

---

## 10. 边界情况与异常测试

### 10.1 `test_permission_check_edge_cases` - 权限检查边界情况

**测试步骤**：

**场景1：circle参数为null或undefined**
- 步骤1：调用checkActionPermission('likePost', { circle: null })
- 步骤2：验证：返回allowed=false, message="参数错误"
- 步骤3：调用getUserStatus(null)
- 步骤4：验证：返回'no_access'状态

**场景2：action参数为空或无效**
- 步骤5：调用checkActionPermission('', { circle })
- 步骤6：验证：返回allowed=false, message="参数错误"
- 步骤7：调用checkActionPermission('invalidAction', { circle })
- 步骤8：验证：返回permission=undefined，按拒绝处理

**场景3：userId参数处理**
- 步骤9：调用getUserStatus(circle, null)（明确传null）
- 步骤10：验证：按未登录处理，返回guest_*状态
- 步骤11：调用getUserStatus(circle)（不传userId）
- 步骤12：验证：自动获取当前用户ID

**场景4：circle数据结构异常**
- 步骤13：创建circle对象，members字段为null
- 步骤14：调用checkIsMember(circle, userId)
- 步骤15：验证：返回false，不抛出错误
- 步骤16：创建circle对象，members为对象数组和字符串数组
- 步骤17：验证：两种格式都能正确判断成员资格

**场景5：isInviteMode参数影响**
- 步骤18：用户访问普通链接（isInviteMode=false）
- 步骤19：验证：不是invited或invited_applied状态
- 步骤20：用户访问邀请链接（isInviteMode=true）
- 步骤21：验证：状态包含invited

**场景6：不需要circle的动作**
- 步骤22：调用checkActionPermission('createCircle', {})（不传circle）
- 步骤23：验证：只检查登录状态，不报错
- 步骤24：调用checkActionPermission('enterListPage', {})
- 步骤25：验证：只检查登录状态，不报错

**清理步骤**：
- 步骤26：清理测试数据

### 10.2 `test_state_determination_priority` - 状态判断优先级测试

**测试目标**：验证状态判断的决策树逻辑正确性

**测试步骤**：

**优先级1：未登录优先**
- 步骤1：设置userId=null, isInviteMode=true
- 步骤2：验证：返回guest_invited（未登录状态）
- 步骤3：设置userId=null, isPublic=true
- 步骤4：验证：返回guest_can_apply
- 步骤5：设置userId=null, isPublic=false
- 步骤6：验证：返回guest_no_access

**优先级2：成员身份优先**
- 步骤7：设置isMember=true, hasApplied=true, isInviteMode=true
- 步骤8：验证：返回member（成员优先于其他状态）

**优先级3：邀请优先于申请**
- 步骤9：设置isMember=false, hasApplied=true, isInviteMode=true
- 步骤10：验证：返回invited_applied（邀请+申请）
- 步骤11：设置isMember=false, hasApplied=true, isInviteMode=false
- 步骤12：验证：返回applied（只有申请）
- 步骤13：设置isMember=false, hasApplied=false, isInviteMode=true
- 步骤14：验证：返回invited（只有邀请）

**优先级4：公开/私密判断**
- 步骤15：设置isMember=false, hasApplied=false, isInviteMode=false, isPublic=true
- 步骤16：验证：返回can_apply
- 步骤17：设置isPublic=false
- 步骤18：验证：返回no_access

**清理步骤**：
- 步骤19：无需清理

### 10.3 `test_concurrent_operations` - 并发操作测试

**测试场景**：验证多个用户同时操作的正确性

**测试步骤**：

**场景1：多用户同时申请**
- 步骤1：创建公开朋友圈
- 步骤2：用户B、C、D同时点击申请加入
- 步骤3：验证：所有申请都成功提交
- 步骤4：验证：三个用户的状态都是applied
- 步骤5：主人审核，验证申请列表包含所有用户

**场景2：同时接受邀请**
- 步骤6：创建私密朋友圈并生成邀请链接
- 步骤7：用户E、F同时通过邀请链接注册并接受邀请
- 步骤8：验证：两个用户都成功加入
- 步骤9：验证：成员列表包含两个用户

**场景3：主人删除朋友圈时有人正在操作**
- 步骤10：用户G正在申请加入朋友圈
- 步骤11：主人同时删除朋友圈
- 步骤12：验证：申请操作返回错误（朋友圈不存在）
- 步骤13：验证：用户G收到友好错误提示

**清理步骤**：
- 步骤14：删除测试数据

---

## 11. 完整端到端测试

### 11.1 `test_complete_permission_lifecycle` - 完整权限生命周期测试

**测试场景**：从未登录到成员的完整流程，验证每个阶段的权限

**前置条件**：
- 步骤1：准备环境，清空所有数据

**测试步骤**：

**阶段1：未登录访问公开朋友圈**
- 步骤2：用户A登录并创建公开朋友圈，发布2个帖子
- 步骤3：用户A退出登录
- 步骤4：未登录用户访问朋友圈
- 步骤5：验证状态=guest_can_apply，UI正确
- 步骤6：验证无法点赞、评论（弹出注册弹窗）
- 步骤7：点击"申请加入"保存意图

**阶段2：注册并自动申请**
- 步骤8：完成注册创建用户B
- 步骤9：验证意图自动执行，申请提交成功
- 步骤10：验证状态=applied，UI显示"审核中"
- 步骤11：验证仍然无法点赞、评论（Toast提示）
- 步骤12：验证无法再次申请（Toast提示）

**阶段3：等待审核期间收到邀请**
- 步骤13：用户B退出登录
- 步骤14：用户A登录并生成邀请链接
- 步骤15：用户A退出登录
- 步骤16：用户B登录并通过邀请链接访问
- 步骤17：验证状态=invited_applied，UI显示"接受邀请"
- 步骤18：验证可以直接接受邀请，无需等待审核

**阶段4：接受邀请成为成员**
- 步骤19：用户B点击"接受邀请"
- 步骤20：验证成功加入，状态=member
- 步骤21：验证UI显示"发布"
- 步骤22：验证可以点赞、评论、发布帖子
- 步骤23：发布1个帖子，点赞并评论其他帖子
- 步骤24：验证所有操作成功

**阶段5：作为成员的完整权限**
- 步骤25：验证可以进入列表页
- 步骤26：验证可以进入发布页
- 步骤27：验证可以创建新朋友圈
- 步骤28：验证无法再次申请或接受邀请（Toast提示"您已是成员"）
- 步骤29：尝试进入设置页（非主人，但member可以进入）
- 步骤30：验证canShareCircle返回false（allowInvite未开启）

**阶段6：主人开启成员邀请权限**
- 步骤31：用户B退出登录
- 步骤32：用户A登录并设置allowInvite=true
- 步骤33：用户A退出登录
- 步骤34：用户B登录
- 步骤35：验证canShareCircle返回true
- 步骤36：用户B生成邀请链接
- 步骤37：验证邀请链接有效

**清理步骤**：
- 步骤38：删除所有测试数据

---

## 测试执行建议

### 优先级划分

**P0（核心功能，必须全部通过）**：
- 4.2 未登录访问公开朋友圈
- 4.3 未登录通过邀请链接访问
- 5.1 成员权限测试
- 5.6 可申请状态
- 6.1 申请到成员的状态转换
- 6.2 邀请到成员的状态转换
- 8.1 接受邀请意图保存
- 8.2 申请加入意图保存
- 11.1 完整权限生命周期测试

**P1（重要功能，影响用户体验）**：
- 4.1 未登录访问私密朋友圈
- 5.2 主人特殊权限测试
- 5.3 已申请等待审核状态
- 5.4 被邀请状态
- 5.5 既申请又被邀请状态
- 5.7 无权访问状态
- 6.3 复杂状态转换流程
- 7.3 成员权限差异测试
- 9.1 所有状态的UI配置验证

**P2（边界情况，增强健壮性）**：
- 7.1 多用户邀请流程
- 7.2 多用户申请流程
- 8.3 意图保存边界情况
- 10.1 权限检查边界情况
- 10.2 状态判断优先级测试
- 10.3 并发操作测试

### 执行顺序建议

1. **第一轮**：执行所有P0测试，确保核心功能正常
2. **第二轮**：执行P1测试，验证用户体验
3. **第三轮**：执行P2测试，提升系统健壮性
4. **回归测试**：每次代码变更后，至少执行所有P0测试

### 测试数据管理

- 每个测试用例开始前清理相关数据
- 测试结束后必须清理创建的所有数据（用户、朋友圈、帖子）
- 使用独特的测试数据标识（如昵称包含"TEST_"前缀）便于识别和清理
- 考虑使用数据库事务或快照功能（如支持）实现快速恢复

### 性能考虑

- 合并相似的测试步骤，减少页面切换
- 利用状态持久化，避免重复登录
- 并行执行独立的测试用例（如支持）
- 使用测试模式的快速清理功能

