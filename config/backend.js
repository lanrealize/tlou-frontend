// config/backend.js
// 后端服务器配置

const BACKEND_CONFIG = {
  // 后端服务器IP地址和端口
  HOST: '192.168.0.110',
  PORT: '3000',
  
  // API基础路径
  API_PATH: '/api',
  
  // 完整的API基础URL
  get BASE_URL() {
    return `http://${this.HOST}:${this.PORT}${this.API_PATH}`;
  }
};

module.exports = {
  BACKEND_CONFIG
};
