# Helper 函数总览

本文档列出所有测试辅助函数的功能概览。

---

## system_helper.py - 小程序生命周期管理

### `launch_miniprogram()`
启动小程序并返回 Minium 实例。

### `close_miniprogram(mini)`
关闭小程序。

### `enter_test_mode(mini)`
进入测试模式，自动清理残留状态并调用 `startTestMode()`。用于将用户切换成一个未登录的测试用户。该测试用户可完成注册，继续后续动作（发帖，点赞等）。

### `exit_test_mode(mini)`
退出测试模式，恢复真实身份。调用 `endTestMode()` 清理测试用户及其后端测试数据。

---

## auth_helper.py - 用户认证

### `get_user_state(mini)`
获取用户完整状态（唯一真相来源）。返回：`login_status`（登录状态：'loggedIn'/'unregistered'），`is_logged_in`（是否已登录），`is_admin`（是否管理员），`is_virtual_identity`（是否虚拟身份），`user_info`（用户信息：_id/username/avatar/circles）。

### `verify_identity(mini, expected_username=None, is_virtual=None)`
验证当前身份是否符合预期（可选检查用户名和虚拟身份标识）。

### `complete_user_login(mini, nickname='测试用户', avatar_url='...')`
完成用户登录流程，包括填写昵称、上传头像、提交注册。

### `verify_login_status(mini, check_page_ui=False)`
验证用户登录状态，可选检查页面UI变化。

### `check_register_popup_visible(mini, expected_reason=None)`
检查注册弹窗是否显示，可选验证弹窗提示文字。

### `close_register_popup_by_mask(mini, wait_visible=0.4, verify_closed=True)`
通过点击遮罩层关闭注册弹窗。

### `ensure_register_popup_closed(mini)`
确保注册弹窗已关闭（如果显示则关闭）。

---

## share_helper.py - 分享功能

### `navigate_to_details_from_share(mini, circle_id=None, inviter_id=None)`
模拟从分享链接进入朋友圈详情页（邀请模式）。

---

## circle_helper.py - 朋友圈操作

### `create_circle(mini)`
创建新朋友圈并返回朋友圈ID。

### `check_circle_status_action(mini, expected_user_status)`
检查 details 页面底部 circle-status-action 组件的UI显示内容。

---

## post_helper.py - 帖子操作

### `publish_post_with_single_image(mini, circle_id, content, image_path, test_images)`
发布带单张图片的帖子。

### `publish_post_with_multi_images(mini, circle_id, content, image_paths)`
发布包含多张图片的帖子。

### `like_post(mini, post_id)`
对帖子进行点赞。

### `unlike_post(mini, post_id)`
取消帖子点赞。

### `comment_on_post(mini, comment_text)`
对帖子进行评论。

### `reply_to_comment(mini, reply_text)`
对评论进行回复。

### `delete_comment(mini, is_reply=True)`
删除评论或回复。

### `delete_post(mini, post_id)`
删除帖子。

---

## common_helper.py - 通用工具

### 图片上传

#### `mock_image_selection(mini, image_paths)`
使用 Minium Mock 准备真实图片文件选择。

#### `upload_single_image_with_button(mini, image_path, button_selector, wait_after=2.0)`
点击按钮上传单张图片（设置Mock + 点击 + 等待）。

#### `upload_multiple_images_with_button(mini, image_paths, button_selector, wait_after=2.0)`
点击按钮上传多张图片（设置Mock + 点击 + 等待）。

#### `get_test_image_path(filename='test.jpg')`
获取测试图片的完整路径。

#### `verify_test_images_exist(image_names=None)`
验证测试图片是否存在。

### 对话框处理

#### `handle_modal_confirm(mini, button_text="确定", timeout=3.0)`
处理微信小程序原生Modal确认对话框。

#### `handle_modal_cancel(mini, timeout=3.0)`
处理微信小程序原生Modal取消操作。

---

## virtual_user_helper.py - 虚拟用户管理

### `navigate_to_management_page(mini, force=False)`
导航到管理页面（仅管理员可用）。

### `get_virtual_users_list(mini)`
获取虚拟用户列表。

### `create_virtual_user(mini, username, avatar_path=None, auto_navigate=True)`
创建虚拟用户（自动处理重名情况）。

### `switch_to_virtual_identity(mini, username=None, user_id=None, auto_navigate=True)`
切换到指定虚拟身份。

### `switch_to_real_identity(mini, auto_navigate=True)`
切换回真实身份。

### `delete_virtual_user(mini, username=None, user_id=None, auto_navigate=True)`
删除虚拟用户。

---

## 使用说明

1. **系统初始化**：先调用 `launch_miniprogram()` 和 `enter_test_mode()`
2. **用户认证**：使用 `complete_user_login()` 完成登录
3. **核心功能**：根据测试场景调用相应的 helper 函数
4. **清理环境**：测试结束调用 `exit_test_mode()` 和 `close_miniprogram()`

所有 helper 函数均返回统一格式的结果字典，包含 `success` 字段和 `message` 字段。

