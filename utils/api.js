// utils/api.js
// API接口封装

const { getOpenid } = require('./auth');

class API {
  constructor() {
    // 延迟获取baseUrl，避免循环依赖
    this.getBaseUrl = () => {
      const app = getApp();
      return app ? app.globalData.baseUrl : 'http://localhost:3000/api';
    };
  }

  // 通用请求方法
  async request(options) {
    const { url, method = 'GET', data = {}, header = {} } = options;
    
    try {
      // 获取认证头
      const openid = await getOpenid();
      header['x-openid'] = openid;
      console.log('添加认证头:', openid);
    } catch (error) {
      console.log('警告：获取openid失败，进行未认证请求:', error.message);
    }

    return new Promise((resolve, reject) => {

      wx.request({
        url: this.getBaseUrl() + url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        success: (res) => {
          // 接受所有2xx状态码（200-299）作为成功
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 对于2xx状态码，如果有success字段则检查，否则直接认为成功
            if (res.data.success === undefined || res.data.success) {
              resolve(res.data);
            } else {
              reject(new Error(res.data.message || '请求失败'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.data.message || '网络错误'}`));
          }
        },
        fail: (err) => {
          console.error('API请求失败:', err);
          reject(new Error('网络连接失败，请检查网络设置'));
        }
      });
    });
  }

  // GET请求
  get(url, data = {}) {
    const query = Object.keys(data).map(key => `${key}=${encodeURIComponent(data[key])}`).join('&');
    const fullUrl = query ? `${url}?${query}` : url;
    return this.request({ url: fullUrl, method: 'GET' });
  }

  // POST请求
  post(url, data = {}) {
    return this.request({ url, method: 'POST', data });
  }

  // PUT请求
  put(url, data = {}) {
    return this.request({ url, method: 'PUT', data });
  }

  // DELETE请求
  delete(url, data = {}) {
    return this.request({ url, method: 'DELETE', data });
  }

  // 朋友圈相关API
  circles = {
    // 获取我创建的朋友圈列表（原有方法）
    getMy: () => this.get('/circles/my'),
    
    // 获取我参与的所有朋友圈列表（包含最新帖子）
    getMyParticipated: () => this.get('/circles/my'),
    
    // 创建朋友圈
    create: (data) => this.post('/circles', data),
    
    // 加入朋友圈
    join: (circleId) => this.post(`/circles/${circleId}/join`),
    
    // 退出朋友圈
    leave: (circleId) => this.delete(`/circles/${circleId}/leave`)
  };

  // 帖子相关API
  posts = {
    // 获取朋友圈的帖子列表
    getList: (circleId) => this.get('/posts', { circleId }),
    
    // 创建帖子
    create: (data) => this.post('/posts', data),
    
    // 删除帖子
    delete: (postId) => this.delete(`/posts/${postId}`),
    
    // 点赞/取消点赞
    like: (postId) => this.post(`/posts/${postId}/like`),
    
    // 添加评论
    addComment: (postId, data) => this.post(`/posts/${postId}/comments`, data),
    
    // 删除评论
    deleteComment: (postId, commentId) => this.delete(`/posts/${postId}/comments/${commentId}`)
  };

  // 微信认证相关API
  wechat = {
    // 获取openid
    getOpenid: (code) => this.post('/wechat/get-openid', { code }),
    
    // 获取用户信息
    getUserInfo: (openid) => this.post('/wechat/get-user-info', { openid }),
    
    // 用户注册
    register: (openid, username, avatar) => this.post('/wechat/register', { openid, username, avatar })
  };
}

// 创建API实例
const api = new API();

// 导出API实例
module.exports = api;