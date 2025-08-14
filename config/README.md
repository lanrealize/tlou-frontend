# 后端配置说明

## 配置文件位置
- `config/backend.js` - 后端服务器配置文件

## 修改后端IP地址
要修改后端服务器地址，请编辑 `config/backend.js` 文件中的以下参数：

```javascript
const BACKEND_CONFIG = {
  // 后端服务器IP地址和端口
  HOST: '192.168.0.111',  // 修改为您的后端服务器IP
  PORT: '3000',           // 修改为您的后端服务器端口
  
  // API基础路径（通常不需要修改）
  API_PATH: '/api',
  
  // 完整的API基础URL（自动生成，不需要手动修改）
  get BASE_URL() {
    return `http://${this.HOST}:${this.PORT}${this.API_PATH}`;
  }
};
```

## 当前配置
- 后端服务器地址：`192.168.0.111:3000`
- API基础URL：`http://192.168.0.111:3000/api`

## 注意事项
1. 修改配置后需要重新启动小程序
2. 确保后端服务器在指定的IP和端口上正常运行
3. 如果在开发环境中使用，建议将配置文件加入版本控制的忽略列表
