# 🔧 后端 API 需求文档

## 📋 概述

为了支持**未登录用户浏览公开朋友圈**的功能，需要后端提供不需要认证的公开 API。

---

## 🎯 需要添加的 API

### 1️⃣ 获取公开朋友圈详情

**接口路径**：
```
GET /api/tlou/public/circles/{circleId}
```

**功能说明**：
- 无需认证（不检查 Authorization header）
- 只返回 `isPublic: true` 的朋友圈
- 如果朋友圈是私密的，返回 403 Forbidden

**请求参数**：
- `circleId`（路径参数）：朋友圈 ID

**返回数据**（与 `/circles/{circleId}` 相同）：
```json
{
  "success": true,
  "data": {
    "circle": {
      "_id": "xxx",
      "name": "朋友圈名称",
      "description": "描述",
      "isPublic": true,
      "ownerId": "xxx",
      "members": ["xxx", "yyy"],
      "appliers": ["zzz"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      ...
    }
  }
}
```

**错误响应**：
```json
// 朋友圈不存在
{
  "success": false,
  "error": "朋友圈不存在",
  "code": 404
}

// 朋友圈是私密的
{
  "success": false,
  "error": "无权访问私密朋友圈",
  "code": 403
}
```

---

### 2️⃣ 获取公开朋友圈的帖子列表

**接口路径**：
```
GET /api/tlou/public/posts?circleId={circleId}&page={page}&limit={limit}
```

**功能说明**：
- 无需认证
- 只返回公开朋友圈的帖子
- 如果朋友圈是私密的，返回 403 Forbidden

**请求参数**：
- `circleId`（Query 参数）：朋友圈 ID
- `page`（Query 参数，可选）：页码，默认 1
- `limit`（Query 参数，可选）：每页数量，默认 10

**返回数据**（与 `/posts` 相同）：
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "_id": "xxx",
        "circleId": "xxx",
        "content": "帖子内容",
        "images": ["url1", "url2"],
        "authorId": "xxx",
        "author": {
          "openid": "xxx",
          "nickname": "用户昵称",
          "avatarUrl": "头像 URL"
        },
        "likes": ["userId1", "userId2"],
        "comments": [...],
        "createdAt": "2024-01-01T00:00:00.000Z",
        ...
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

**错误响应**：
```json
// 朋友圈不存在或是私密的
{
  "success": false,
  "error": "无权访问",
  "code": 403
}
```

---

### 3️⃣ 确认随机推荐 API 无需认证（可能已实现）

**接口路径**：
```
GET /api/tlou/circles/random?excludeVisited=true&resetHistory=true
```

**功能说明**：
- 请确认此接口是否需要认证
- **建议：应该无需认证**，因为推荐公开朋友圈给所有用户
- 只推荐 `isPublic: true` 的朋友圈

**如果当前需要认证**：
- 请移除认证要求
- 或提供新的公开版本：`GET /api/tlou/public/circles/random`

---

## 🔐 认证逻辑说明

### 当前 API（需要认证）

以下 API **应该保持需要认证**：

```
GET  /api/tlou/circles/my                    ✅ 需要认证
GET  /api/tlou/circles/{id}                  ✅ 需要认证（已登录用户访问）
POST /api/tlou/circles                       ✅ 需要认证
PUT  /api/tlou/circles/{id}                  ✅ 需要认证
POST /api/tlou/circles/{id}/apply            ✅ 需要认证
POST /api/tlou/circles/{id}/join             ✅ 需要认证

GET  /api/tlou/posts?circleId={id}           ✅ 需要认证（已登录用户访问）
POST /api/tlou/posts                         ✅ 需要认证
POST /api/tlou/posts/{id}/like               ✅ 需要认证
POST /api/tlou/posts/{id}/comments           ✅ 需要认证
```

### 新增 API（无需认证）

以下 API **应该无需认证**：

```
GET  /api/tlou/public/circles/{id}           ⭐ 无需认证（新增）
GET  /api/tlou/public/posts?circleId={id}    ⭐ 无需认证（新增）
GET  /api/tlou/circles/random                ⭐ 无需认证（确认或修改）
```

---

## 🛠️ 实现建议

### 后端实现参考（伪代码）

```javascript
// 1. 获取公开朋友圈详情
router.get('/public/circles/:circleId', async (req, res) => {
  const { circleId } = req.params;
  
  // 不检查认证，直接查询
  const circle = await Circle.findById(circleId);
  
  if (!circle) {
    return res.status(404).json({ 
      success: false, 
      error: '朋友圈不存在' 
    });
  }
  
  // 只允许访问公开朋友圈
  if (!circle.isPublic) {
    return res.status(403).json({ 
      success: false, 
      error: '无权访问私密朋友圈' 
    });
  }
  
  res.json({ success: true, data: { circle } });
});

// 2. 获取公开朋友圈的帖子
router.get('/public/posts', async (req, res) => {
  const { circleId, page = 1, limit = 10 } = req.query;
  
  // 不检查认证，但需要验证朋友圈是公开的
  const circle = await Circle.findById(circleId);
  
  if (!circle || !circle.isPublic) {
    return res.status(403).json({ 
      success: false, 
      error: '无权访问' 
    });
  }
  
  // 查询帖子
  const posts = await Post.find({ circleId })
    .populate('author')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  const total = await Post.countDocuments({ circleId });
  
  res.json({ 
    success: true, 
    data: { posts, total, page, limit } 
  });
});
```

### 安全注意事项

1. ✅ **公开 API 只返回公开朋友圈**
   - 严格检查 `isPublic: true`
   - 私密朋友圈返回 403，不暴露存在性

2. ✅ **防止滥用**
   - 考虑添加访问频率限制（Rate Limiting）
   - 单个 IP 每分钟最多请求 60 次

3. ✅ **数据脱敏**
   - 公开 API 不返回敏感信息
   - 例如：不返回申请者列表（appliers）

4. ✅ **日志记录**
   - 记录公开 API 的访问日志
   - 监控异常访问模式

---

## 📊 前后端协作流程

### 前端逻辑（已实现）

```javascript
// pages/details/details.js - loadCircleDetail()
async loadCircleDetail() {
  const isLoggedIn = currentUser && currentUser._id;
  
  if (isLoggedIn) {
    // 已登录：调用需要认证的 API
    try {
      const circlesRes = await api.circles.getMy();
      targetCircle = circlesRes.data.circles.find(c => c._id === circleId);
    } catch (error) { ... }
    
    if (!targetCircle) {
      const detailRes = await api.circles.getDetail(circleId);
      targetCircle = detailRes.data.circle;
    }
  } else {
    // 未登录：调用公开 API
    try {
      const detailRes = await api.circles.getPublicDetail(circleId);  // ⭐ 新 API
      targetCircle = detailRes.data.circle;
    } catch (error) {
      if (error.statusCode === 403) {
        // 私密朋友圈，提示登录
        wx.showModal({ title: '需要登录', ... });
      }
    }
  }
}
```

### 前端 API 定义（已实现）

```javascript
// utils/api.js
circles = {
  // 已有 API（需要认证）
  getMy: () => this.get('/circles/my'),
  getDetail: (circleId) => this.get(`/circles/${circleId}`),
  
  // ⭐ 新增 API（无需认证）
  getPublicDetail: (circleId) => this.get(`/public/circles/${circleId}`),
};

posts = {
  // 已有 API（需要认证）
  getList: (circleId, params = {}) => this.get('/posts', { circleId, ...params }),
  
  // ⭐ 新增 API（无需认证）
  getPublicList: (circleId, params = {}) => this.get('/public/posts', { circleId, ...params }),
};
```

---

## ✅ 验收标准

### 测试场景 1：未登录用户浏览公开朋友圈

```
1. 用户未登录
2. 点击"发现有趣朋友圈"推荐卡片
3. 前端调用 GET /api/tlou/public/circles/{id}
4. 后端返回 200，包含朋友圈详情
5. 前端调用 GET /api/tlou/public/posts?circleId={id}
6. 后端返回 200，包含帖子列表
7. 页面正常显示朋友圈内容和帖子
8. 底部显示"申请加入"按钮
```

### 测试场景 2：未登录用户访问私密朋友圈

```
1. 用户未登录
2. 尝试访问私密朋友圈
3. 前端调用 GET /api/tlou/public/circles/{id}
4. 后端返回 403 Forbidden
5. 前端显示 Modal："需要登录"
6. 点击"去登录"跳转到注册页
```

### 测试场景 3：已登录用户仍使用原有 API

```
1. 用户已登录
2. 访问任意朋友圈
3. 前端调用 GET /api/tlou/circles/my
4. 前端调用 GET /api/tlou/circles/{id}
5. 前端调用 GET /api/tlou/posts?circleId={id}
6. 所有 API 正常返回（原有逻辑不变）
```

---

## 📅 开发优先级

| 优先级 | API | 说明 | 预计工作量 |
|--------|-----|------|-----------|
| 🔴 P0 | `GET /public/circles/{id}` | 核心功能，必须实现 | 2-3 小时 |
| 🔴 P0 | `GET /public/posts?circleId={id}` | 核心功能，必须实现 | 2-3 小时 |
| 🟡 P1 | 确认 `GET /circles/random` 无需认证 | 优化体验 | 30 分钟 |
| 🟢 P2 | 添加 Rate Limiting | 防止滥用 | 1-2 小时 |

**总计**：约 **5-8 小时**

---

## 🎯 后续优化（可选）

1. **缓存优化**
   - 公开朋友圈详情使用 CDN 缓存
   - 减少数据库查询

2. **性能优化**
   - 公开朋友圈列表添加索引
   - 帖子查询优化

3. **分析统计**
   - 记录公开朋友圈的浏览量
   - 分析推荐效果

---

## 📞 联系方式

如有疑问，请随时联系前端开发团队。

**前端已完成**：
- ✅ API 调用逻辑优化
- ✅ 登录状态判断
- ✅ 401/403 错误处理
- ✅ 公开 API 接口定义

**等待后端实现**：
- ⏳ `GET /public/circles/{id}`
- ⏳ `GET /public/posts?circleId={id}`
- ⏳ 确认 `GET /circles/random` 认证策略

---

**文档版本**：v1.0  
**创建日期**：2024年  
**最后更新**：2024年

