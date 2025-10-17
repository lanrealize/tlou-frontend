// config/backend.js
// 后端服务器配置

const BACKEND_CONFIG = {
  // 后端服务器域名
  HOST: 'www.wltech-service.site',
  // 之前的本地配置（备份）
  // HOST: '172.20.10.2',
  // HOST: 'localhost',
  // PORT: '3000',
  
  // API基础路径
  API_PATH: '/api/tlou',
  // API_PATH: ':3001/api',
  
  // 完整的API基础URL
  get BASE_URL() {
    return `https://${this.HOST}${this.API_PATH}`;
    // return `http://${this.HOST}${this.API_PATH}`;
  }
};

module.exports = {
  BACKEND_CONFIG
};
