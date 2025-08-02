// __tests__/utils/api.test.js
/**
 * API接口测试
 */

// 模拟auth模块
jest.mock('../../utils/auth', () => ({
  getOpenid: jest.fn()
}));

const api = require('../../utils/api');
const { getOpenid } = require('../../utils/auth');

describe('API接口封装', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 默认模拟成功获取openid
    getOpenid.mockResolvedValue('mock-openid-123');
    
    // 模拟getApp返回baseUrl
    global.getApp = jest.fn(() => ({
      globalData: {
        baseUrl: 'http://localhost:3000/api'
      }
    }));
  });

  describe('通用请求方法', () => {
    test('应该正确发送GET请求', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { message: 'success' }
          }
        });
      });

      const result = await api.get('/test', { param: 'value' });

      expect(wx.request).toHaveBeenCalledWith({
        url: 'http://localhost:3000/api/test?param=value',
        method: 'GET',
        data: { param: 'value' },
        header: {
          'Content-Type': 'application/json',
          'x-openid': 'mock-openid-123'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });

      expect(result).toEqual({
        success: true,
        data: { message: 'success' }
      });
    });

    test('应该正确发送POST请求', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { id: 123 }
          }
        });
      });

      const postData = { name: 'test', value: 'data' };
      const result = await api.post('/create', postData);

      expect(wx.request).toHaveBeenCalledWith({
        url: 'http://localhost:3000/api/create',
        method: 'POST',
        data: postData,
        header: {
          'Content-Type': 'application/json',
          'x-openid': 'mock-openid-123'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });

      expect(result).toEqual({
        success: true,
        data: { id: 123 }
      });
    });

    test('应该处理网络请求失败', async () => {
      wx.request.mockImplementation(({ fail }) => {
        fail(new Error('Network Error'));
      });

      await expect(api.get('/test')).rejects.toThrow('网络连接失败，请检查网络设置');
    });

    test('应该处理HTTP错误状态码', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 404,
          data: { message: 'Not Found' }
        });
      });

      await expect(api.get('/notfound')).rejects.toThrow('HTTP 404: Not Found');
    });

    test('应该处理API返回的错误', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: false,
            message: '参数错误'
          }
        });
      });

      await expect(api.post('/test')).rejects.toThrow('参数错误');
    });

    test('openid获取失败时应该继续请求', async () => {
      getOpenid.mockRejectedValue(new Error('获取openid失败'));

      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true }
        });
      });

      const result = await api.get('/test');

      expect(wx.request).toHaveBeenCalledWith({
        url: 'http://localhost:3000/api/test',
        method: 'GET',
        data: {},
        header: {
          'Content-Type': 'application/json'
          // 注意：没有x-openid header
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('朋友圈相关API', () => {
    test('获取我的朋友圈列表', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { circles: [] }
          }
        });
      });

      const result = await api.circles.getMy();

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/circles/my',
          method: 'GET'
        })
      );

      expect(result.data.circles).toEqual([]);
    });

    test('创建朋友圈', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { circle: { _id: 'circle123', name: '测试朋友圈' } }
          }
        });
      });

      const circleData = { name: '测试朋友圈', isPublic: false };
      const result = await api.circles.create(circleData);

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/circles',
          method: 'POST',
          data: circleData
        })
      );

      expect(result.data.circle.name).toBe('测试朋友圈');
    });

    test('加入朋友圈', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true }
        });
      });

      await api.circles.join('circle123');

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/circles/circle123/join',
          method: 'POST'
        })
      );
    });
  });

  describe('帖子相关API', () => {
    test('获取帖子列表', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { posts: [] }
          }
        });
      });

      const result = await api.posts.getList('circle123', { page: 1, limit: 10 });

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/posts?circleId=circle123&page=1&limit=10',
          method: 'GET'
        })
      );

      expect(result.data.posts).toEqual([]);
    });

    test('创建帖子', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { post: { _id: 'post123' } }
          }
        });
      });

      const postData = { content: '测试帖子', circleId: 'circle123' };
      const result = await api.posts.create(postData);

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/posts',
          method: 'POST',
          data: postData
        })
      );

      expect(result.data.post._id).toBe('post123');
    });

    test('点赞帖子', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { liked: true }
          }
        });
      });

      const result = await api.posts.like('post123');

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/posts/post123/like',
          method: 'POST'
        })
      );

      expect(result.data.liked).toBe(true);
    });

    test('添加评论', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { commentId: 'comment123' }
          }
        });
      });

      const commentData = { content: '测试评论' };
      const result = await api.posts.addComment('post123', commentData);

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/posts/post123/comments',
          method: 'POST',
          data: commentData
        })
      );

      expect(result.data.commentId).toBe('comment123');
    });
  });

  describe('微信认证相关API', () => {
    test('获取openid', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { openid: 'wx-openid-123' }
          }
        });
      });

      const result = await api.wechat.getOpenid('wx-code-123');

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/wechat/get-openid',
          method: 'POST',
          data: { code: 'wx-code-123' }
        })
      );

      expect(result.data.openid).toBe('wx-openid-123');
    });

    test('用户注册', async () => {
      wx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: {
            success: true,
            data: { user: { _id: 'user123' } }
          }
        });
      });

      const result = await api.wechat.register('openid123', '测试用户', 'avatar.jpg');

      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/wechat/register',
          method: 'POST',
          data: {
            openid: 'openid123',
            username: '测试用户',
            avatar: 'avatar.jpg'
          }
        })
      );

      expect(result.data.user._id).toBe('user123');
    });
  });
});