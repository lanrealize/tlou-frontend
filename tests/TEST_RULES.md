# 测试规则（精简版）

## 1. Minium 技术核心

### 如何在测试中执行 JS 代码
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
**关键：必须 `sync=True` + 函数有 `return`**

### 穿透 Shadow DOM
```python
element = page.get_element('component-name>>>.inner-class')
```
**格式：`组件标签>>>内部选择器`**

## 2. 等待时间标准

```python
time.sleep(0.1)   # 点击后稳定
time.sleep(0.3)   # 页面初始化、页面跳转
time.sleep(0.5)   # 弹窗状态变化
time.sleep(1.0)   # 网络请求完成
```
**原则：能短不长，尽量 ≤ 1.0s**

## 3. 方法优先级

1. **优先**：Minium 原生 API
   ```python
   element = page.get_element('.class')
   value = page.data.get('key')
   ```

2. **必要时**：JS 调用（需要调用页面方法或复杂逻辑时）

## 4. 验证规则

### ❌ 错误：只操作不验证
```python
element.tap()
return True  # 没验证！
```

### ✅ 正确：验证操作带来的变化
```python
before_id = page.data.get('circles', [])[0].get('_id')
element.tap()
time.sleep(1.0)
after_id = self.mini.app.current_page.data.get('circles', [])[0].get('_id')

if before_id != after_id:
    return True
```

**必须：看源码 → 找可验证点（ID/路径/状态）→ 验证变化**

## 5. 异常处理不能让本该失败的case通过



**原则：功能严格验证优先，可选容错**

## 6. 质量检查

写完测试检查：
- [ ] 用了原生方法？
- [ ] 有准确验证？
- [ ] 等待尽量短？
- [ ] 看过源码？

## 7. 工具函数

### 测试环境 (test_helper)

```python
from helpers.test_helper import launch_miniprogram, enter_test_mode, exit_test_mode

# 启动/关闭小程序
mini = launch_miniprogram()
close_miniprogram(mini)

# 进入/退出测试模式
enter_test_mode(mini)  # 自动清理数据、切换到未登录状态
exit_test_mode(mini)   # 清理测试数据、恢复原身份
```

### 导航到 details 页面 (test_helper)

#### navigate_to_details - 普通模式（从discover进入）

```python
from helpers.test_helper import navigate_to_details

# 进入指定圈子（普通模式，非邀请）
result = navigate_to_details(mini, circle_id='68f4bf50aa1585d65eef34ce')

# 可指定来源（默认'discover'）
result = navigate_to_details(mini, circle_id='xxx', source='discover')

# 不带来源参数
result = navigate_to_details(mini, circle_id='xxx', source=None)
```

**适用场景：**
- ✅ 测试特定圈子（如有评论的圈子）
- ✅ 不需要邀请模式
- ✅ 模拟从discover进入

#### navigate_to_details_from_share - 邀请模式（从分享进入）

```python
from helpers.test_helper import navigate_to_details_from_share

# 用法1：自动获取推荐圈子（如果测试不在乎具体哪个圈子）
result = navigate_to_details_from_share(mini)

# 用法2：进入指定圈子的邀请模式
result = navigate_to_details_from_share(mini, circle_id='xxx', inviter_id='yyy')
```

**适用场景：**
- ✅ 测试邀请模式（type=invite&inviterId）
- ✅ 验证"你收到了邀请"状态

### 组件验证 (test_helper)
#### 验证 circle_status_action 组件状态正确性

```python
from helpers.test_helper import check_circle_status_action

# 检查 circle-status-action 组件显示内容
result = check_circle_status_action(mini, '你收到了邀请', '点击右侧按钮加入这个朋友圈', '接受邀请')

if result['match']:
    print('✅ 组件显示正确')
else:
    print(result['errors'])  # 显示具体错误
```
#### 验证 user-info-popup 组件状态正确性

```python
from helpers.popup_helper import check_popup_visible, close_popup_by_mask

# 检查 user-info-popup 弹窗（可选验证文字）
result = check_popup_visible(mini, expected_reason='登录后才能点赞')
if result['visible'] and result['match']:
    print('✅ 弹窗显示且文字正确')

# 关闭弹窗（自动验证是否关闭）
close_popup_by_mask(mini, wait_visible=0.4, verify_closed=True)
```

---

**核心：原生优先 + 准确验证 + 高效等待 + 善用工具**
