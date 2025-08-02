# TLOU Frontend - 微信小程序朋友圈

这是一个类似微信朋友圈的微信小程序前端项目，支持用户认证、朋友圈管理、帖子发布、点赞评论等功能。

## ✨ 项目特性

- 🔐 **微信登录认证** - 支持微信授权登录和用户注册
- 👥 **朋友圈管理** - 创建、加入、管理多个朋友圈
- 📝 **动态发布** - 支持文字、图片动态发布
- 👍 **互动功能** - 点赞、评论、回复等社交功能
- 📱 **响应式设计** - 适配不同尺寸的微信小程序界面
- 🎯 **状态管理** - 使用 MobX 进行响应式状态管理

## 🛠️ 技术栈

- **框架**: 微信小程序原生开发
- **状态管理**: MobX + mobx-miniprogram-bindings
- **测试框架**: Jest + miniprogram-simulate
- **代码转译**: Babel
- **API**: RESTful API

## 📦 项目结构

```
tlou-frontend/
├── components/          # 自定义组件
│   └── post-item/      # 帖子项组件
├── pages/              # 页面
│   ├── main/           # 主页
│   ├── list/           # 朋友圈列表
│   ├── details/        # 朋友圈详情
│   ├── publish/        # 发布动态
│   ├── setting/        # 设置页面
│   └── userInfo/       # 用户信息
├── store/              # 状态管理
│   ├── userStore.js    # 用户状态
│   └── postStore.js    # 帖子状态
├── utils/              # 工具函数
│   ├── api.js          # API封装
│   ├── auth.js         # 认证相关
│   └── util.js         # 通用工具
├── __tests__/          # 测试文件
└── styles/             # 公共样式
```

## 🚀 快速开始

### 环境要求

- 微信开发者工具
- Node.js 14+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

1. 使用微信开发者工具打开项目
2. 确保后端服务已启动
3. 修改 `app.js` 中的 `baseUrl` 为你的后端地址

### 运行测试

```bash
# 运行所有测试
npm test

# 观察模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 只运行单元测试
npm run test:unit

# 只运行端到端测试
npm run test:e2e
```

## 🧪 测试说明

项目包含了完整的单元测试覆盖：

### 测试类型

1. **Store 测试** - 测试 MobX 状态管理逻辑
2. **工具函数测试** - 测试通用工具函数
3. **组件测试** - 测试自定义组件的渲染和交互
4. **API 测试** - 测试网络请求封装

### 运行示例测试

```bash
# 测试用户状态管理
npm test -- userStore.test.js

# 测试工具函数
npm test -- util.test.js

# 测试组件
npm test -- post-item.test.js

# 测试API封装
npm test -- api.test.js
```

### 测试覆盖率

项目设置了覆盖率阈值（70%），确保代码质量：

- 分支覆盖率: 70%
- 函数覆盖率: 70%
- 行覆盖率: 70%
- 语句覆盖率: 70%

## 📊 性能优化

项目已实施多项性能优化：

### 已优化项目

1. **用户标识一致性** - 统一使用 `_id` 作为用户标识符
2. **异步存储** - 使用异步存储避免阻塞UI线程
3. **防重复提交** - 评论和点赞操作防重复提交
4. **内存泄漏防护** - 正确清理 MobX 绑定
5. **请求节流** - 朋友圈数据加载节流机制
6. **错误处理** - 完善的错误处理和用户提示

### 性能建议

1. **图片优化** - 建议使用 CDN 和图片压缩
2. **数据分页** - 大列表数据分页加载
3. **缓存策略** - 实施适当的数据缓存
4. **代码分割** - 使用小程序分包加载

## 🔧 API 接口

### 认证相关

- `POST /wechat/get-openid` - 获取用户 openid
- `POST /wechat/get-user-info` - 获取用户信息
- `POST /wechat/register` - 用户注册

### 朋友圈相关

- `GET /circles/my` - 获取我的朋友圈列表
- `POST /circles` - 创建朋友圈
- `POST /circles/:id/join` - 加入朋友圈
- `DELETE /circles/:id/leave` - 退出朋友圈

### 帖子相关

- `GET /posts` - 获取帖子列表
- `POST /posts` - 创建帖子
- `POST /posts/:id/like` - 点赞/取消点赞
- `POST /posts/:id/comments` - 添加评论
- `DELETE /posts/:id` - 删除帖子

## 🐛 调试和排错

### 常见问题

1. **登录失败** - 检查后端服务和 openid 获取
2. **网络请求失败** - 检查 `baseUrl` 配置和网络连接
3. **状态不同步** - 检查 MobX 绑定和全局状态

### 调试工具

- 使用微信开发者工具的调试面板
- 查看 Console 日志输出
- 使用 vConsole 进行真机调试

## 📝 更新日志

### v1.0.0 (2024-01-15)

#### 新功能
- ✨ 完整的朋友圈功能实现
- ✨ 微信登录和用户管理
- ✨ 动态发布和互动功能

#### 性能优化
- ⚡ 用户标识一致性优化
- ⚡ 异步存储机制
- ⚡ 防重复提交保护
- ⚡ 内存泄漏修复

#### 测试覆盖
- 🧪 完整的单元测试套件
- 🧪 组件测试覆盖
- 🧪 API接口测试
- 🧪 70%+ 代码覆盖率

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 遵循 ESLint 规则
- 编写相应的单元测试
- 确保测试覆盖率不低于 70%
- 添加适当的注释和文档

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [MobX 文档](https://mobx.js.org/)
- [Jest 测试框架](https://jestjs.io/)
- [miniprogram-simulate](https://github.com/wechat-miniprogram/miniprogram-simulate)

---

**注意**: 使用前请确保配置正确的后端服务地址，并获得相应的微信小程序开发权限。