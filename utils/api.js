// utils/api.js
// API接口封装

const { getOpenid } = require('./auth');
const { BACKEND_CONFIG } = require('../config/backend');

class API {
  constructor() {
    // 延迟获取baseUrl，避免循环依赖
    this.getBaseUrl = () => {
      const app = getApp();
      return app ? app.globalData.baseUrl : BACKEND_CONFIG.BASE_URL;
    };
  }

  // 🔑 核心方法：检查用户资料是否完整
  isProfileComplete() {
    try {
      const app = getApp();
      const userStore = app?.getUserStore();
      return userStore && userStore.isProfileComplete;
    } catch (error) {
      return false;
    }
  }

  // 通用请求方法
  async request(options) {
    const { url, method = 'GET', data = {}, header = {}, timeout = 10000 } = options;
    
    // 🔍 调试模式：记录请求信息
    const DEBUG_API = true; // 设置为 false 可关闭调试日志
    
    try {
      // 🎯 优化：优先从 userStore 获取 openid，如果没有则从 Storage 获取
      // 这样即使用户未登录（未注册），也能发送 openid 用于限流等功能
      const app = getApp();
      const userStore = app?.getUserStore();
      
      let openid = null;
      
      // 方案1：资料完整用户，从 userStore 获取
      if (userStore && userStore.isProfileComplete && userStore.userInfo?._id) {
        openid = userStore.userInfo._id;
        if (DEBUG_API) {
          console.log('✅ 从 userStore 获取 openid:', openid);
        }
      } 
      // 方案2：未登录用户，从 Storage 获取
      else {
        try {
          openid = wx.getStorageSync('openid');
          if (openid && DEBUG_API) {
            console.log('✅ 从 Storage 获取 openid:', openid);
          }
        } catch (error) {
          if (DEBUG_API) {
            console.warn('⚠️ 从 Storage 获取 openid 失败:', error);
          }
        }
      }
      
      // 如果有 openid，添加到请求头
      if (openid) {
        header['x-openid'] = openid;
        if (DEBUG_API) {
          console.log('✅ 已添加 x-openid 到请求头');
        }
      } else {
        if (DEBUG_API) {
          console.warn('⚠️ 未找到 openid，请求将不包含身份信息');
        }
      }
    } catch (error) {
      // 静默处理openid获取失败
      if (DEBUG_API) {
        console.error('❌ 获取openid失败:', error);
      }
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
        timeout,
        success: (res) => {
          if (DEBUG_API) {
            console.log(`📥 响应状态: ${res.statusCode}`);
          }
          
          // 接受所有2xx状态码（200-299）作为成功
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 检查响应是否表示失败：success 字段为 false
            if (res.data.success === false) {
              if (DEBUG_API) {
                console.error('❌ 请求失败:', res.data.message);
              }
              reject(new Error(res.data.message || '请求失败'));
            } else {
              // 其他情况认为成功
              if (DEBUG_API) {
                console.log('✅ 请求成功');
              }
              resolve(res.data);
            }
          } else {
            // 创建包含完整响应信息的错误对象
            if (DEBUG_API) {
              console.error(`❌ HTTP ${res.statusCode}:`, res.data.message);
              
              // 特别处理403错误
              if (res.statusCode === 403) {
                console.error('🚨 403错误诊断:');
                console.error('   请求header:', header);
                console.error('   是否有x-openid:', !!header['x-openid']);
              }
              
              // 特别处理429错误（配额超限）
              if (res.statusCode === 429) {
                console.warn('⚠️ 配额超限:', res.data);
              }
            }
            
            const error = new Error(`HTTP ${res.statusCode}: ${res.data.message || '网络错误'}`);
            error.response = {
              status: res.statusCode,
              data: res.data
            };
            error.code = res.data.code; // 保存错误代码（如 QUOTA_EXCEEDED）
            reject(error);
          }
        },
        fail: (err) => {
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
    // 获取我创建的朋友圈列表（始终需要认证）
    getMy: () => this.get('/circles/my'),
    
    // 获取我参与的所有朋友圈列表（包含最新帖子）
    getMyParticipated: () => this.get('/circles/my'),
    
    // 获取朋友圈详情
    getDetail: (circleId, params = {}) => this.get(`/circles/${circleId}`, params),
    
    // 🆕 获取邀请码（圈主专用）
    getInviteCode: (circleId) => this.get(`/circles/${circleId}/invite-code`),
    
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
    leave: (circleId, openid) => this.delete(`/circles/${circleId}/leave`, { openid }),
    
    // 删除朋友圈
    delete: (circleId) => this.delete(`/circles/${circleId}`),
    
    // 添加成员
    addMember: (circleId, data) => this.post(`/circles/${circleId}/members`, data),
    
    // 移除成员（后端参数名改为 memberOpenid）
    removeMember: (circleId, memberOpenid) => this.delete(`/circles/${circleId}/members/${memberOpenid}`),
    
    // === 申请加入功能 ===
    // 申请加入朋友圈
    applyToJoin: (circleId) => this.post(`/circles/${circleId}/apply`),
    
    // 同意申请（朋友圈主人操作，后端参数名改为 userOpenid）
    approveApplication: (circleId, userOpenid) => this.post(`/circles/${circleId}/approve/${userOpenid}`),
    
    // 拒绝申请（朋友圈主人操作，后端参数名改为 userOpenid）
    rejectApplication: (circleId, userOpenid) => this.post(`/circles/${circleId}/reject/${userOpenid}`),
    
    // 获取申请者列表（朋友圈主人查看）
    getAppliers: (circleId) => this.get(`/circles/${circleId}/appliers`),
    
    // === 随机公开朋友圈推荐功能 ===
    // ⭐ 获取随机公开朋友圈（使用公开API，支持未登录用户）

    // === 邀请功能 ===
    // 接受邀请（加入朋友圈）
    acceptInvite: async (circleId) => {
      // 获取当前用户的 openid（统一处理真实和虚拟身份）
      const app = getApp();
      const userStore = app?.getUserStore();
      
      // ✅ 后端架构：_id 就是 openid 值
      if (!userStore || !userStore.isProfileComplete || !userStore.userInfo?._id) {
        throw new Error('未获取到用户身份信息');
      }
      
      // ✅ 后端架构：_id 就是 openid 值
      return this.post(`/circles/${circleId}/join`, { openid: userStore.userInfo._id });
    }
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
    like: (postId) => this.post(`/posts/${postId}/react`),
    
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
    
    // 完善用户资料
    register: (openid, username, avatar) => this.post('/wechat/complete-profile', { openid, username, avatar })
  };

  // 🎭 管理员相关API (虚拟用户管理)
  admin = {
    // 创建虚拟用户
    createVirtualUser: (data) => this.post('/admin/virtual-users', data),
    
    // 获取虚拟用户列表
    getVirtualUsers: () => this.get('/admin/virtual-users'),
    
    // 更新虚拟用户信息（后端参数名改为 userOpenid）
    updateVirtualUser: (userOpenid, data) => this.put(`/admin/virtual-users/${userOpenid}`, data),
    
    // 删除虚拟用户（后端参数名改为 userOpenid）
    deleteVirtualUser: (userOpenid) => this.delete(`/admin/virtual-users/${userOpenid}`)
  };
}

// 创建API实例
const api = new API();

// 导出API实例
module.exports = api;