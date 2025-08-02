// __tests__/components/post-item.test.js
/**
 * 帖子组件测试
 */

const simulate = require('miniprogram-simulate');
const path = require('path');

describe('post-item 帖子组件', () => {
  let id;
  let comp;

  beforeAll(() => {
    // 加载组件
    id = simulate.load(path.join(__dirname, '../../components/post-item/post-item'));
  });

  beforeEach(() => {
    // 创建组件实例
    comp = simulate.render(id, {
      post: {
        _id: 'post123',
        content: '这是一条测试帖子',
        author: {
          _id: 'user123',
          username: '测试用户',
          avatar: '/images/default_avatar.png'
        },
        images: [],
        likes: [],
        comments: [],
        formattedTime: '刚刚',
        isLiked: false
      },
      currentUser: {
        _id: 'user123',
        username: '测试用户'
      },
      showActions: true
    });

    // 挂载到DOM
    comp.attach(document.createElement('parent-wrapper'));
  });

  afterEach(() => {
    // 清理组件
    if (comp) {
      comp.detach();
    }
  });

  describe('组件渲染', () => {
    test('应该正确渲染帖子内容', () => {
      expect(comp.toJSON()).toMatchSnapshot();
    });

    test('应该显示帖子基本信息', () => {
      const data = comp.data;
      expect(data.post.content).toBe('这是一条测试帖子');
      expect(data.post.author.username).toBe('测试用户');
    });
  });

  describe('用户交互', () => {
    test('点击点赞按钮应该触发like事件', async () => {
      const mockLikeHandler = jest.fn();
      comp.addEventListener('like', mockLikeHandler);

      // 触发点赞
      comp.instance.onLike();
      await simulate.sleep(10);

      expect(mockLikeHandler).toHaveBeenCalledWith({
        detail: {
          postId: 'post123',
          post: expect.objectContaining({
            _id: 'post123'
          })
        }
      });
    });

    test('点击评论按钮应该触发comment事件', async () => {
      const mockCommentHandler = jest.fn();
      comp.addEventListener('comment', mockCommentHandler);

      // 触发评论
      comp.instance.onComment();
      await simulate.sleep(10);

      expect(mockCommentHandler).toHaveBeenCalledWith({
        detail: {
          postId: 'post123',
          post: expect.objectContaining({
            _id: 'post123'
          })
        }
      });
    });

    test('点击头像应该触发tapAvatar事件', async () => {
      const mockAvatarHandler = jest.fn();
      comp.addEventListener('tapAvatar', mockAvatarHandler);

      // 触发头像点击
      comp.instance.onTapAvatar();
      await simulate.sleep(10);

      expect(mockAvatarHandler).toHaveBeenCalledWith({
        detail: {
          user: expect.objectContaining({
            _id: 'user123',
            username: '测试用户'
          }),
          post: expect.objectContaining({
            _id: 'post123'
          })
        }
      });
    });
  });

  describe('评论功能', () => {
    beforeEach(() => {
      // 设置带评论的帖子
      comp.setData({
        post: {
          ...comp.data.post,
          comments: [
            {
              _id: 'comment1',
              content: '评论1',
              author: { _id: 'user1', username: '用户1' },
              formattedTime: '1分钟前'
            },
            {
              _id: 'comment2',
              content: '评论2',
              author: { _id: 'user2', username: '用户2' },
              formattedTime: '2分钟前'
            },
            {
              _id: 'comment3',
              content: '评论3',
              author: { _id: 'user3', username: '用户3' },
              formattedTime: '3分钟前'
            },
            {
              _id: 'comment4',
              content: '评论4',
              author: { _id: 'user4', username: '用户4' },
              formattedTime: '4分钟前'
            }
          ]
        }
      });
    });

    test('应该限制显示的评论数量', () => {
      const data = comp.data;
      expect(data.displayComments).toHaveLength(3); // maxCommentsShow = 3
    });

    test('点击展开应该显示所有评论', () => {
      comp.instance.toggleComments();
      
      const data = comp.data;
      expect(data.commentsExpanded).toBe(true);
      expect(data.displayComments).toHaveLength(4);
    });

    test('回复评论应该触发replyComment事件', async () => {
      const mockReplyHandler = jest.fn();
      comp.addEventListener('replyComment', mockReplyHandler);

      // 模拟回复评论
      const mockEvent = {
        currentTarget: {
          dataset: {
            userId: 'user1',
            username: '用户1'
          }
        }
      };

      comp.instance.onReplyComment(mockEvent);
      await simulate.sleep(10);

      expect(mockReplyHandler).toHaveBeenCalledWith({
        detail: {
          postId: 'post123',
          post: expect.objectContaining({
            _id: 'post123'
          }),
          replyToUser: {
            id: 'user1',
            username: '用户1'
          }
        }
      });
    });
  });

  describe('图片预览', () => {
    beforeEach(() => {
      // 设置带图片的帖子
      comp.setData({
        post: {
          ...comp.data.post,
          images: [
            'http://example.com/image1.jpg',
            'http://example.com/image2.jpg'
          ]
        }
      });
    });

    test('点击图片应该触发预览事件', async () => {
      const mockPreviewHandler = jest.fn();
      comp.addEventListener('previewImage', mockPreviewHandler);

      // 模拟点击图片
      const mockEvent = {
        currentTarget: {
          dataset: {
            current: 'http://example.com/image1.jpg'
          }
        }
      };

      comp.instance.onPreviewImage(mockEvent);
      await simulate.sleep(10);

      expect(mockPreviewHandler).toHaveBeenCalledWith({
        detail: {
          current: 'http://example.com/image1.jpg',
          urls: [
            'http://example.com/image1.jpg',
            'http://example.com/image2.jpg'
          ]
        }
      });
    });
  });

  describe('数据监听器', () => {
    test('评论数据变化应该更新显示评论', () => {
      const initialLength = comp.data.displayComments.length;

      // 添加新评论
      comp.setData({
        'post.comments': [
          ...comp.data.post.comments,
          {
            _id: 'newComment',
            content: '新评论',
            author: { _id: 'newUser', username: '新用户' },
            formattedTime: '刚刚'
          }
        ]
      });

      // 验证显示评论已更新
      expect(comp.data.displayComments.length).toBeGreaterThanOrEqual(initialLength);
    });
  });
});