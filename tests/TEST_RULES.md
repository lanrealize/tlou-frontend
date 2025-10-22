# 测试规则（精简版）

## 1. Minium 技术核心

### JS 同步调用
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

### ✅ 正确：验证数据变化
```python
before_id = page.data.get('circles', [])[0].get('_id')
element.tap()
time.sleep(1.0)
after_id = self.mini.app.current_page.data.get('circles', [])[0].get('_id')

if before_id != after_id:
    return True
```

**必须：看源码 → 找可验证点（ID/路径/状态）→ 验证变化**

## 5. 异常处理

```python
# 元素可选：允许不存在
try:
    element = page.get_element('.optional')
except:
    return True  # 不存在也是正常

# 元素必需：不捕获异常
element = page.get_element('.required')  # 找不到就失败
```

**原则：可选容错，必需严格**

## 6. 质量检查

写完测试检查：
- [ ] 用了原生方法？
- [ ] 有准确验证？
- [ ] 等待尽量短？
- [ ] 看过源码？

---

**核心：原生优先 + 准确验证 + 高效等待**
