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

  // PATCH请求
  patch(url, data = {}) {
    return this.request({ url, method: 'PATCH', data });
  }

  // 朋友圈相关API
  circles = {
    // 获取我创建的朋友圈列表（原有方法）
    getMy: () => this.get('/circles/my'),
    
    // 获取我参与的所有朋友圈列表（包含最新帖子）
    getMyParticipated: () => this.get('/circles/my'),
    
    // 获取朋友圈详情
    getDetail: (circleId) => this.get(`/circles/${circleId}`),
    
    // 获取朋友圈成员
    getMembers: (circleId) => this.get(`/circles/${circleId}/members`),
    
    // 创建朋友圈
    create: (data) => this.post('/circles', data),
    
    // 更新朋友圈设置
    update: (circleId, data) => this.put(`/circles/${circleId}`, data),
    
    // 更新朋友圈设置 (使用PATCH接口)
    updateSettings: (circleId, data) => this.patch(`/circles/${circleId}/settings`, data),
    
    // 加入朋友圈
    join: (circleId) => this.post(`/circles/${circleId}/join`),
    
    // 退出朋友圈
    leave: (circleId) => this.delete(`/circles/${circleId}/leave`),
    
    // 添加成员
    addMember: (circleId, data) => this.post(`/circles/${circleId}/members`, data),
    
    // 移除成员
    removeMember: (circleId, memberId) => this.delete(`/circles/${circleId}/members/${memberId}`),
    
    // === 申请加入功能 ===
    // 申请加入朋友圈
    applyToJoin: (circleId) => this.post(`/circles/${circleId}/apply`),
    
    // 同意申请（朋友圈主人操作）
    approveApplication: (circleId, userId) => this.post(`/circles/${circleId}/approve/${userId}`),
    
    // 拒绝申请（朋友圈主人操作）
    rejectApplication: (circleId, userId) => this.post(`/circles/${circleId}/reject/${userId}`),
    
    // 获取申请者列表（朋友圈主人查看）
    getAppliers: (circleId) => this.get(`/circles/${circleId}/appliers`),
    
    // === 随机公开朋友圈推荐功能 ===
    // 获取随机公开朋友圈（返回单个朋友圈）
    getRandomPublicCircle: (params = {}) => this.get('/circles/random', params),

    // === 邀请功能 ===
    // 邀请用户加入
    inviteUser: (circleId, userId) => this.post(`/circles/${circleId}/invite`, { userId }),
    
    // 接受邀请
    acceptInvite: (circleId) => this.post(`/circles/${circleId}/accept-invite`),
    
    // 拒绝邀请  
    declineInvite: (circleId) => this.post(`/circles/${circleId}/decline-invite`),
    
    // 取消邀请
    cancelInvite: (circleId, userId) => this.delete(`/circles/${circleId}/invite/${userId}`),
    
    // 获取邀请列表
    getInvitees: (circleId) => this.get(`/circles/${circleId}/invitees`)
  };

  // 帖子相关API
  posts = {
    // 获取朋友圈的帖子列表
    getList: (circleId, params = {}) => this.get('/posts', { circleId, ...params }),
    
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

  // 🎭 管理员相关API (虚拟用户管理)
  admin = {
    // 创建虚拟用户
    createVirtualUser: (data) => this.post('/admin/virtual-users', data),
    
    // 获取虚拟用户列表
    getVirtualUsers: () => this.get('/admin/virtual-users'),
    
    // 更新虚拟用户信息
    updateVirtualUser: (userId, data) => this.put(`/admin/virtual-users/${userId}`, data),
    
    // 删除虚拟用户
    deleteVirtualUser: (userId) => this.delete(`/admin/virtual-users/${userId}`)
  };
}

// 创建API实例
const api = new API();

// 导出API实例
module.exports = api;