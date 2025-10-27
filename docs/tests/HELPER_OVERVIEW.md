# Helper 函数总览

本文档列出所有测试辅助函数的功能概览。

---

## system_helper.py - 小程序生命周期管理

### system_helper.py → `launch_miniprogram()`
启动小程序并返回 Minium 实例。

### system_helper.py → `close_miniprogram(mini)`
关闭小程序。

### system_helper.py → `enter_test_mode(mini)`
进入测试模式，自动清理残留状态并调用 `startTestMode()`。用于将用户切换成一个未登录的测试用户。该测试用户可完成注册，继续后续动作（发帖，点赞等）。

### system_helper.py → `exit_test_mode(mini)`
退出测试模式，恢复真实身份。调用 `endTestMode()` 清理测试用户及其后端测试数据。

---

## auth_helper.py - 用户认证

### auth_helper.py → `get_user_state(mini)`
获取用户完整状态（唯一真相来源）。返回：`login_status`（登录状态：'loggedIn'/'unregistered'），`is_logged_in`（是否已登录），`is_admin`（是否管理员），`is_virtual_identity`（是否虚拟身份），`user_info`（用户信息：_id/username/avatar/circles）。

### auth_helper.py → `verify_identity(mini, expected_username=None, is_virtual=None)`
验证当前身份是否符合预期（可选检查用户名和虚拟身份标识）。

### auth_helper.py → `switch_to_identity(mini, user_info, identity_type='test')`
切换到指定身份（test/virtual/real）。只修改 MobX，不修改 Storage。适用于测试模式下的临时身份切换。

### auth_helper.py → `complete_user_login(mini, nickname='测试用户', avatar_url='...')`
完成用户登录流程，包括填写昵称、上传头像、提交注册。

### auth_helper.py → `verify_login_status(mini, check_page_ui=False)`
验证用户登录状态，可选检查页面UI变化。

### auth_helper.py → `check_register_popup_visible(mini, expected_reason=None)`
检查注册弹窗是否显示，可选验证弹窗提示文字。

### auth_helper.py → `close_register_popup_by_mask(mini, wait_visible=0.4, verify_closed=True)`
通过点击遮罩层关闭注册弹窗。

### auth_helper.py → `ensure_register_popup_closed(mini)`
确保注册弹窗已关闭（如果显示则关闭）。

---

## navigation_helper.py - 页面导航

### navigation_helper.py → `navigate_to_details_from_share(mini, circle_id=None, inviter_id=None)`
模拟从分享链接进入朋友圈详情页（邀请模式）。

### navigation_helper.py → `navigate_to_details(mini, circle_id, source='discover')`
导航到朋友圈详情页（普通模式）。支持指定来源标识（如 'discover', 'list' 等），会验证页面是否成功加载 circle 数据。

### navigation_helper.py → `navigate_to_main(mini, use_relaunch=False)`
导航到 main 页面。可选使用 `reLaunch` 清空页面栈。

### navigation_helper.py → `navigate_to_list(mini)`
导航到朋友圈列表页面。验证页面加载成功并返回页面标题。

---

## circle_helper.py - 朋友圈操作

### circle_helper.py → `create_circle(mini)`
创建新朋友圈并返回朋友圈ID。

### circle_helper.py → `check_circle_status_action(mini, expected_user_status)`
检查 details 页面底部 circle-status-action 组件的UI显示内容。

### circle_helper.py → `set_circle_public(mini, circle_id=None)`
设置朋友圈为公开。自动导航到 details 页面，进入设置页面并开启公开开关。

### circle_helper.py → `apply_to_join_circle(mini)`
申请加入朋友圈。点击申请加入按钮提交申请。

### circle_helper.py → `process_unique_join_application(mini, circle_id=None, action='approve')`
处理朋友圈中唯一的加入申请。支持接受（approve）或拒绝（reject）申请。

### circle_helper.py → `delete_circle(mini, circle_id)`
删除指定朋友圈。自动导航到列表页面，点击删除按钮并处理确认对话框，验证删除成功。

### circle_helper.py → `enter_discover_circle(mini)`
从 main 页面点击发现朋友圈卡片进入 details 页面，并验证图片一致性。通过 UI 元素获取信息，模拟真实用户操作。

### circle_helper.py → `verify_discover_refresh(mini)`
验证发现朋友圈的刷新功能。通过检查 UI 元素的 `data-refresh-timestamp` 属性验证刷新动作，不依赖朋友圈 ID 是否改变。

---

## workflow_helper.py - 工作流测试

### workflow_helper.py → `check_actions_unregistered_main(mini)`
验证未注册用户在 main 页面的所有动作是否有正确反馈。包括：登录按钮、历史记录、创建朋友圈、刷新推荐、进入发现朋友圈。

### workflow_helper.py → `check_actions_unregistered_details(mini, test_circle_id)`
验证未注册用户在 details 页面的所有动作是否有正确反馈。包括：点赞弹窗、评论弹窗、设置弹窗、回复评论弹窗。

### workflow_helper.py → `check_actions_member_main(mini, circle_id, test_images)`
验证成员在 details 页面的完整发帖工作流。包括：发帖（单图）、点赞、评论、回复、删除评论、取消点赞、删除帖子、发帖（多图）。

---

## post_helper.py - 帖子操作

### post_helper.py → `publish_post_with_single_image(mini, circle_id, content, image_path, test_images)`
发布带单张图片的帖子。

### post_helper.py → `publish_post_with_multi_images(mini, circle_id, content, image_paths)`
发布包含多张图片的帖子。

### post_helper.py → `like_post(mini, post_id, expect_success=True)`
对帖子进行点赞。`expect_success=False` 可跳过验证，用于测试无权限点赞等失败场景。

### post_helper.py → `unlike_post(mini, post_id)`
取消帖子点赞。

### post_helper.py → `comment_on_post(mini, comment_text)`
对帖子进行评论。

### post_helper.py → `reply_to_comment(mini, reply_text)`
对评论进行回复。

### post_helper.py → `delete_comment(mini, is_reply=True)`
删除评论或回复。

### post_helper.py → `delete_post(mini, post_id)`
删除帖子。

---

## common_helper.py - 通用工具

### JavaScript 执行

#### common_helper.py → `evaluate_js(mini, js_code)`
执行 JavaScript 代码并返回结果。自动包装为立即执行函数，只需写核心逻辑。

### 图片上传

#### common_helper.py → `mock_image_selection(mini, image_paths)`
使用 Minium Mock 准备真实图片文件选择。

#### common_helper.py → `upload_single_image_with_button(mini, image_path, button_selector, wait_after=2.0)`
点击按钮上传单张图片（设置Mock + 点击 + 等待）。

#### common_helper.py → `upload_multiple_images_with_button(mini, image_paths, button_selector, wait_after=2.0)`
点击按钮上传多张图片（设置Mock + 点击 + 等待）。

#### common_helper.py → `get_test_image_path(filename='test.jpg')`
获取测试图片的完整路径。

#### common_helper.py → `verify_test_images_exist(image_names=None)`
验证测试图片是否存在。

### 对话框处理

#### common_helper.py → `handle_modal_confirm(mini, button_text="确定", timeout=3.0)`
处理微信小程序原生Modal确认对话框。

#### common_helper.py → `handle_modal_cancel(mini, timeout=3.0)`
处理微信小程序原生Modal取消操作。

### Toast 提示框

#### common_helper.py → `check_toast(mini, expected_text=None, since=None)`
检查微信小程序Toast提示框。

---

## virtual_user_helper.py - 虚拟用户管理

### virtual_user_helper.py → `navigate_to_management_page(mini, force=False)`
导航到管理页面（仅管理员可用）。

### virtual_user_helper.py → `get_virtual_users_list(mini)`
获取虚拟用户列表。

### virtual_user_helper.py → `create_virtual_user(mini, username, avatar_path=None, auto_navigate=True)`
创建虚拟用户（自动处理重名情况）。

### virtual_user_helper.py → `switch_to_virtual_identity(mini, username=None, user_id=None, auto_navigate=True)`
切换到指定虚拟身份。

### virtual_user_helper.py → `switch_to_real_identity(mini, auto_navigate=True)`
切换回真实身份。

### virtual_user_helper.py → `delete_virtual_user(mini, username=None, user_id=None, auto_navigate=True)`
删除虚拟用户。

---

## 使用说明

1. **系统初始化**：先调用 `launch_miniprogram()` 和 `enter_test_mode()`
2. **用户认证**：使用 `complete_user_login()` 完成登录
3. **身份切换**：测试模式下可用 `switch_to_identity()` 在测试/真实/虚拟身份间切换
4. **核心功能**：根据测试场景调用相应的 helper 函数
5. **清理环境**：测试结束调用 `exit_test_mode()` 和 `close_miniprogram()`

所有 helper 函数均返回统一格式的结果字典，包含 `success` 字段和 `message` 字段。

