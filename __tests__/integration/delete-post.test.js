// __tests__/integration/delete-post.test.js
/**
 * 删除帖子功能集成测试
 */

// 模拟API
jest.mock('../../utils/api', () => ({
  posts: {
    delete: jest.fn()
  }
}));

// 模拟微信API
global.wx = {
  showModal: jest.fn(),
  showToast: jest.fn()
};

const { postStore } = require('../../store/postStore');
const api = require('../../utils/api');

describe('删除帖子功能集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置store状态
    postStore.posts = [];
    postStore.status = 'empty';
    postStore.errorMessage = '';
  });

  describe('权限控制', () => {
    test('只有帖子作者应该能看到删除按钮', () => {
      const currentUser = { _id: 'user123', username: '当前用户' };
      const ownPost = {
        _id: 'post123',
        content: '我的帖子',
        author: { _id: 'user123', username: '当前用户' }
      };
      const otherPost = {
        _id: 'post456',
        content: '别人的帖子',
        author: { _id: 'user456', username: '其他用户' }
      };

      // 模拟组件的权限检查逻辑
      const shouldShowDeleteButton = (post, currentUser) => {
        return currentUser._id === post.author._id;
      };

      // 自己的帖子应该显示删除按钮
      expect(shouldShowDeleteButton(ownPost, currentUser)).toBe(true);
      
      // 别人的帖子不应该显示删除按钮
      expect(shouldShowDeleteButton(otherPost, currentUser)).toBe(false);
    });

    test('未登录用户不应该看到删除按钮', () => {
      const post = {
        _id: 'post123',
        content: '帖子内容',
        author: { _id: 'user123', username: '作者' }
      };

      const shouldShowDeleteButton = (post, currentUser) => {
        return Boolean(currentUser && currentUser._id === post.author._id);
      };

      // 未登录用户（currentUser为null）
      expect(shouldShowDeleteButton(post, null)).toBe(false);
      
      // 未登录用户（currentUser为undefined）
      expect(shouldShowDeleteButton(post, undefined)).toBe(false);
      
      // 空用户对象
      expect(shouldShowDeleteButton(post, {})).toBe(false);
    });
  });

  describe('删除流程', () => {
    test('成功删除帖子应该更新本地状态', async () => {
      // 初始化帖子列表
      postStore.posts = [
        { _id: 'post123', content: '帖子1' },
        { _id: 'post456', content: '帖子2' },
        { _id: 'post789', content: '帖子3' }
      ];

      // 模拟API成功响应
      api.posts.delete.mockResolvedValue({
        success: true,
        message: '帖子删除成功'
      });

      // 执行删除
      await postStore.deletePost('post456');

      // 验证API调用
      expect(api.posts.delete).toHaveBeenCalledWith('post456');
      
      // 验证本地状态更新
      expect(postStore.posts).toHaveLength(2);
      expect(postStore.posts.find(p => p._id === 'post456')).toBeUndefined();
      expect(postStore.posts[0]._id).toBe('post123');
      expect(postStore.posts[1]._id).toBe('post789');
    });

    test('删除最后一个帖子应该设置空状态', async () => {
      // 只有一个帖子
      postStore.posts = [{ _id: 'post123', content: '最后的帖子' }];
      postStore.status = 'loaded';

      api.posts.delete.mockResolvedValue({ success: true });

      await postStore.deletePost('post123');

      expect(postStore.posts).toHaveLength(0);
      expect(postStore.status).toBe('empty');
    });

    test('删除失败应该抛出错误且不修改本地状态', async () => {
      const originalPosts = [
        { _id: 'post123', content: '帖子1' },
        { _id: 'post456', content: '帖子2' }
      ];
      postStore.posts = [...originalPosts];

      // 模拟API错误
      api.posts.delete.mockRejectedValue(new Error('帖子不存在或无权限删除'));

      // 执行删除并期望抛出错误
      await expect(postStore.deletePost('post123')).rejects.toThrow('帖子不存在或无权限删除');

      // 验证本地状态未被修改
      expect(postStore.posts).toEqual(originalPosts);
    });

    test('删除不存在的帖子应该正常处理', async () => {
      postStore.posts = [{ _id: 'post123', content: '存在的帖子' }];

      api.posts.delete.mockResolvedValue({ success: true });

      // 尝试删除不存在的帖子
      await postStore.deletePost('nonexistent');

      // API仍然被调用
      expect(api.posts.delete).toHaveBeenCalledWith('nonexistent');
      
      // 原有帖子不受影响
      expect(postStore.posts).toHaveLength(1);
      expect(postStore.posts[0]._id).toBe('post123');
    });
  });

  describe('错误处理', () => {
    test('网络错误应该抛出相应错误', async () => {
      postStore.posts = [{ _id: 'post123', content: '帖子' }];

      api.posts.delete.mockRejectedValue(new Error('网络连接失败'));

      await expect(postStore.deletePost('post123')).rejects.toThrow('网络连接失败');
      
      // 本地状态应该保持不变
      expect(postStore.posts).toHaveLength(1);
    });

    test('服务器错误应该抛出相应错误', async () => {
      postStore.posts = [{ _id: 'post123', content: '帖子' }];

      api.posts.delete.mockRejectedValue(new Error('服务器内部错误'));

      await expect(postStore.deletePost('post123')).rejects.toThrow('服务器内部错误');
    });

    test('权限不足错误应该抛出相应错误', async () => {
      postStore.posts = [{ _id: 'post123', content: '帖子' }];

      api.posts.delete.mockRejectedValue(new Error('帖子不存在或无权限删除'));

      await expect(postStore.deletePost('post123')).rejects.toThrow('帖子不存在或无权限删除');
    });
  });

  describe('边界情况', () => {
    test('空帖子列表不应该出错', async () => {
      postStore.posts = [];

      api.posts.delete.mockResolvedValue({ success: true });

      await postStore.deletePost('post123');

      expect(api.posts.delete).toHaveBeenCalledWith('post123');
      expect(postStore.posts).toHaveLength(0);
    });

    test('删除帖子时传入空ID应该正常处理', async () => {
      postStore.posts = [{ _id: 'post123', content: '帖子' }];

      api.posts.delete.mockResolvedValue({ success: true });

      await postStore.deletePost('');

      expect(api.posts.delete).toHaveBeenCalledWith('');
      expect(postStore.posts).toHaveLength(1);
    });

    test('删除帖子时传入null应该正常处理', async () => {
      postStore.posts = [{ _id: 'post123', content: '帖子' }];

      api.posts.delete.mockResolvedValue({ success: true });

      await postStore.deletePost(null);

      expect(api.posts.delete).toHaveBeenCalledWith(null);
      expect(postStore.posts).toHaveLength(1);
    });
  });

  describe('组件事件测试', () => {
    test('组件删除事件应该包含正确的数据结构', () => {
      const mockPost = {
        _id: 'post123',
        content: '测试帖子',
        author: { _id: 'user123', username: '作者' }
      };

      // 模拟组件的删除事件触发
      const mockTriggerEvent = jest.fn();
      const componentContext = {
        data: { post: mockPost },
        triggerEvent: mockTriggerEvent
      };

      // 模拟组件的onDeletePost方法
      const onDeletePost = function() {
        this.triggerEvent('deletePost', {
          postId: this.data.post._id,
          post: this.data.post
        });
      };

      onDeletePost.call(componentContext);

      expect(mockTriggerEvent).toHaveBeenCalledWith('deletePost', {
        postId: 'post123',
        post: mockPost
      });
    });
  });
});