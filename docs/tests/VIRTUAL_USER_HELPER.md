# 虚拟用户 Helper 使用说明

虚拟用户 Helper 提供了一组简洁的函数，用于在自动化测试中管理和操作虚拟用户身份。

## 功能列表

### 1. 页面导航

**`navigate_to_management_page(mini, force=False)`**
- 导航到身份管理页面
- `force=True` 时强制重新导航（即使已在管理页面）

### 2. 身份查询

**`get_current_identity(mini)`**
- 获取当前登录身份信息
- 返回：是否管理员、是否虚拟身份、用户信息

**`get_virtual_users_list(mini)`**
- 获取所有虚拟用户列表
- 返回：虚拟用户数量和详细信息

### 3. 虚拟用户管理

**`create_virtual_user(mini, username, avatar_path=None, auto_navigate=True)`**
- 创建新的虚拟用户
- 支持上传头像（可选）
- 自动处理同名用户（先删除后创建）
- `auto_navigate=False` 时不自动导航到管理页面

**`delete_virtual_user(mini, username=None, user_id=None, auto_navigate=True)`**
- 删除指定的虚拟用户
- 可通过用户名或用户ID删除
- 自动确认删除弹窗

### 4. 身份切换

**`switch_to_virtual_identity(mini, username=None, user_id=None, auto_navigate=True)`**
- 切换到指定的虚拟身份
- 可通过用户名或用户ID切换
- 切换后留在管理页面（不自动返回）

**`switch_to_real_identity(mini, auto_navigate=True)`**
- 切换回真实的管理员身份
- 切换后自动刷新虚拟用户列表
- 切换后留在管理页面（不自动返回）

## 使用示例

```python
from tests.helpers import (
    navigate_to_management_page,
    create_virtual_user,
    switch_to_virtual_identity,
    switch_to_real_identity,
    delete_virtual_user
)

# 1. 导航到管理页面
navigate_to_management_page(mini)

# 2. 创建虚拟用户（带头像）
create_virtual_user(mini, 'TEST_用户A', avatar_path='test.jpg', auto_navigate=False)

# 3. 切换到虚拟身份
switch_to_virtual_identity(mini, username='TEST_用户A', auto_navigate=False)

# 4. 切换回真实身份
switch_to_real_identity(mini, auto_navigate=False)

# 5. 删除虚拟用户
delete_virtual_user(mini, username='TEST_用户A', auto_navigate=False)
```

## 最佳实践

1. **测试数据命名**：建议使用 `TEST_` 前缀命名测试用户，便于识别和清理

2. **头像上传**：使用 `tests/resources/` 目录下的测试图片

3. **数据清理**：测试结束后删除所有 `TEST_` 前缀的虚拟用户

4. **等待时间**：Helper 内部已包含必要的等待时间，无需额外 sleep
