# 测试系统概览

## 测试原则

### 核心规则

- ✅ **所有 UI 交互必须使用 Minium 模拟真实用户操作（实在难以实现的除外）**
- ✅ **只有状态查询和确认允许使用 JS 代码完成**

### 元素定位原则

- ✅ **测试中如果要和元素互动或检查元素状态，毫不犹豫地在 WXML 中为元素添加 `id` 以简化测试实现**
- 🎯 好的 `id` 命名使测试代码更清晰、更可维护

## 测试用例

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

## 核心技术积累

### 1. 在测试中执行 JS 代码

```python
js_code = """
function getData() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    return { data: currentPage.data.someValue };
}
"""
result = self.mini.app.evaluate(js_code.strip(), sync=True)
data = result.get('result', {}).get('result', {})
```

**关键要点**：
- ✅ Minium 期望传入**函数定义**（不是直接的执行语句）
- ✅ 函数必须有 `return` 语句
- ✅ 必须 `sync=True`（异步函数会自动等待 Promise）

### 2. 穿透组件 Shadow DOM

```python
element = page.get_element('component-name>>>.inner-class')
```

**格式**：`组件标签>>>内部选择器`

### 3. 模拟选择图片

```python
# 位置：test_complete_user_flow.py 第710行
def _add_images(self, image_paths):
    """使用Minium Mock选择真实图片文件"""
    import os
    real_images = []
    
    for path in image_paths:
        if os.path.exists(path):
            real_images.append(path)
    
    if real_images:
        # 使用 Minium 的 Mock 功能
        self.mini.mock_wx_method(
            'chooseMedia',
            result={
                'tempFiles': [
                    {'tempFilePath': path, 'size': os.path.getsize(path)}
                    for path in real_images
                ]
            }
        )
```

### 4. 处理原生 Modal 对话框

```python
# 位置：helpers/test_helper.py 第639行、第670行

# 确认对话框
handle_modal_confirm(mini, button_text="确定", timeout=3.0)

# 取消对话框
handle_modal_cancel(mini, timeout=3.0)
```

**原理**：通过 Minium 的 `mini.app.mock_wx_method()` 模拟微信原生 Modal 的行为

## 辅助工具模块

**位置**：`tests/helpers/`

- `test_helper.py` - 核心测试工具（启动/关闭、测试模式、登录、Modal 处理）
- `popup_helper.py` - 弹窗检测、关闭、等待
- `js_helpers.py` - JS 代码执行封装

## 测试资源

**位置**：`tests/resources/`
- `test.jpg`, `test1.jpg`, `test2.jpg` - 测试图片文件

## 运行测试

```bash
# Windows
.\run_tests.bat

# 或直接运行单个测试
python tests\test_cases\test_login.py
```

