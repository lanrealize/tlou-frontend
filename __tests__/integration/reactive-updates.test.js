// __tests__/integration/reactive-updates.test.js
/**
 * 响应式更新和UI同步集成测试
 * 专门测试前端最常见的显示更新问题
 */

const { userStore, USER_STATUS } = require('../../store/userStore');
const { postStore, POST_STATUS } = require('../../store/postStore');

describe('响应式更新和UI同步测试', () => {
  beforeEach(() => {
    // 重置所有store状态
    userStore.loginStatus = USER_STATUS.UNREGISTERED;
    userStore.userInfo = null;
    userStore.errorMessage = '';
    userStore.isLoading = false;
    
    postStore.status = POST_STATUS.EMPTY;
    postStore.posts = [];
    postStore.currentCircleId = '';
    postStore.errorMessage = '';
    postStore.isLoading = false;
  });

  describe('用户状态变化的响应式更新', () => {
    test('登录状态变化应该立即反映在所有相关属性上', () => {
      // 模拟登录过程
      const userInfo = {
        _id: 'user123',
        username: '测试用户',
        avatar: 'http://example.com/avatar.jpg'
      };

      // 执行状态变更
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo });

      // 验证所有相关状态都已同步更新
      expect(userStore.loginStatus).toBe(USER_STATUS.LOGGEDIN);
      expect(userStore.userInfo).toEqual(userInfo);
      expect(userStore.isLoading).toBe(false);
      expect(userStore.errorMessage).toBe('');
      
      // 验证计算属性也正确更新
      expect(userStore.isLoggedIn).toBe(true);
      expect(userStore.hasError).toBe(false);
      expect(userStore.displayName).toBe('测试用户');
    });

    test('用户信息更新应该立即反映在界面显示中', () => {
      // 初始登录
      userStore.setStatus(USER_STATUS.LOGGEDIN, { 
        userInfo: { _id: 'user123', username: '老用户名', avatar: 'old.jpg' }
      });

      // 更新用户信息
      const newUserInfo = { _id: 'user123', username: '新用户名', avatar: 'new.jpg' };
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: newUserInfo });

      // 验证界面应该显示最新的用户信息
      expect(userStore.userInfo.username).toBe('新用户名');
      expect(userStore.userInfo.avatar).toBe('new.jpg');
      
      // 确保没有残留的旧状态
      expect(userStore.userInfo.username).not.toBe('老用户名');
    });

    test('退出登录应该立即清空所有用户相关状态', () => {
      // 先登录
      userStore.setStatus(USER_STATUS.LOGGEDIN, { 
        userInfo: { _id: 'user123', username: '用户' }
      });

      // 退出登录
      userStore.logout();

      // 验证所有状态都已清空
      expect(userStore.loginStatus).toBe(USER_STATUS.UNREGISTERED);
      expect(userStore.userInfo).toBeNull();
      expect(userStore.isLoggedIn).toBe(false);
      expect(userStore.hasError).toBe(false);
    });
  });

  describe('帖子列表的响应式更新', () => {
    test('加载帖子后状态应该立即更新', async () => {
      const mockPosts = [
        { _id: 'post1', content: '帖子1', likes: [], comments: [] },
        { _id: 'post2', content: '帖子2', likes: [], comments: [] }
      ];

      // 模拟加载过程
      postStore.setStatus(POST_STATUS.LOADING);
      expect(postStore.isLoading).toBe(true);
      expect(postStore.isLoadingPosts).toBe(true);

      // 加载完成
      postStore.setStatus(POST_STATUS.LOADED, { posts: mockPosts });
      
      // 验证状态立即同步
      expect(postStore.isLoading).toBe(false);
      expect(postStore.status).toBe(POST_STATUS.LOADED);
      expect(postStore.posts).toHaveLength(2);
      expect(postStore.postsCount).toBe(2);
      expect(postStore.isEmpty).toBe(false);
    });

    test('点赞操作应该立即更新UI显示', () => {
      // 设置帖子列表
      const posts = [
        { 
          _id: 'post123', 
          content: '测试帖子', 
          likes: ['user456'], 
          isLiked: false 
        }
      ];
      postStore.posts = posts;

      // 模拟用户信息
      global.getApp = jest.fn(() => ({
        getUserStore: jest.fn(() => ({
          userInfo: { _id: 'user123' }
        }))
      }));

      // 执行点赞操作（模拟）
      const post = postStore.posts[0];
      post.likes.push('user123');
      post.isLiked = true;

      // 验证UI应该立即显示更新
      expect(post.likes).toContain('user123');
      expect(post.isLiked).toBe(true);
      expect(post.likes).toHaveLength(2);
    });

    test('添加评论应该立即在列表中显示', () => {
      // 设置帖子
      const posts = [
        { 
          _id: 'post123', 
          content: '测试帖子', 
          comments: [] 
        }
      ];
      postStore.posts = posts;

      // 添加评论
      const newComment = {
        _id: 'comment123',
        content: '新评论',
        author: { _id: 'user123', username: '用户' }
      };
      
      postStore.posts[0].comments.push(newComment);

      // 验证评论立即显示
      expect(postStore.posts[0].comments).toHaveLength(1);
      expect(postStore.posts[0].comments[0].content).toBe('新评论');
    });
  });

  describe('异步操作的状态同步', () => {
    test('连续的异步操作不应该造成状态混乱', async () => {
      // 模拟快速连续的状态变更
      postStore.setStatus(POST_STATUS.LOADING);
      postStore.setStatus(POST_STATUS.LOADED, { posts: [{ _id: 'post1' }] });
      postStore.setStatus(POST_STATUS.LOADING);
      postStore.setStatus(POST_STATUS.LOADED, { posts: [{ _id: 'post2' }] });

      // 验证最终状态正确
      expect(postStore.status).toBe(POST_STATUS.LOADED);
      expect(postStore.posts).toHaveLength(1);
      expect(postStore.posts[0]._id).toBe('post2');
      expect(postStore.isLoading).toBe(false);
    });

    test('错误状态应该立即显示给用户', () => {
      // 模拟网络错误
      postStore.setStatus(POST_STATUS.ERROR, { message: '网络连接失败' });

      // 验证错误状态立即可见
      expect(postStore.hasError).toBe(true);
      expect(postStore.errorMessage).toBe('网络连接失败');
      expect(postStore.isLoading).toBe(false);
    });
  });

  describe('跨组件状态同步', () => {
    test('用户登录状态变化应该影响帖子权限显示', () => {
      // 设置帖子（需要登录查看）
      postStore.posts = [{ _id: 'post123', content: '需要登录的帖子' }];

      // 未登录状态
      userStore.setStatus(USER_STATUS.UNREGISTERED);
      expect(userStore.isLoggedIn).toBe(false);

      // 登录后
      userStore.setStatus(USER_STATUS.LOGGEDIN, { 
        userInfo: { _id: 'user123', username: '用户' }
      });
      
      // 验证权限状态立即更新
      expect(userStore.isLoggedIn).toBe(true);
      expect(userStore.userInfo).toBeTruthy();
    });

    test('朋友圈切换应该立即清空旧数据', () => {
      // 设置当前朋友圈数据
      postStore.currentCircleId = 'circle1';
      postStore.posts = [
        { _id: 'post1', content: '圈子1的帖子' },
        { _id: 'post2', content: '圈子1的帖子2' }
      ];

      // 切换朋友圈
      postStore.setCurrentCircle('circle2');

      // 验证旧数据立即清空
      expect(postStore.currentCircleId).toBe('circle2');
      expect(postStore.posts).toHaveLength(0);
      expect(postStore.page).toBe(1);
      expect(postStore.hasMore).toBe(true);
    });
  });

  describe('UI反馈及时性测试', () => {
    test('加载状态应该立即显示给用户', () => {
      // 开始加载
      postStore.setStatus(POST_STATUS.LOADING);

      // 验证加载状态立即可见
      expect(postStore.isLoading).toBe(true);
      expect(postStore.isLoadingPosts).toBe(true);
      
      // 可以用于显示加载指示器
      expect(postStore.status).toBe(POST_STATUS.LOADING);
    });

    test('用户操作应该有立即的视觉反馈', () => {
      userStore.setLoading(true);
      expect(userStore.isLoading).toBe(true);

      userStore.setLoading(false);
      expect(userStore.isLoading).toBe(false);
    });

    test('数据为空时应该显示正确的空状态', () => {
      postStore.setStatus(POST_STATUS.EMPTY);
      
      expect(postStore.isEmpty).toBe(true);
      expect(postStore.posts).toHaveLength(0);
      expect(postStore.hasError).toBe(false);
      expect(postStore.isLoading).toBe(false);
    });
  });

  describe('边界条件的状态处理', () => {
    test('快速点击应该不会造成状态不一致', () => {
      let clickCount = 0;
      
      // 模拟用户快速点击
      for (let i = 0; i < 5; i++) {
        userStore.setLoading(true);
        clickCount++;
        userStore.setLoading(false);
      }

      // 验证最终状态一致
      expect(userStore.isLoading).toBe(false);
      expect(clickCount).toBe(5);
    });

    test('网络中断后重连应该正确恢复状态', () => {
      // 模拟网络错误
      postStore.setStatus(POST_STATUS.ERROR, { message: '网络错误' });
      expect(postStore.hasError).toBe(true);

      // 模拟网络恢复，重新加载
      postStore.setStatus(POST_STATUS.LOADING);
      expect(postStore.hasError).toBe(false);
      expect(postStore.isLoading).toBe(true);

      // 加载成功
      postStore.setStatus(POST_STATUS.LOADED, { posts: [{ _id: 'post1' }] });
      expect(postStore.hasError).toBe(false);
      expect(postStore.isLoading).toBe(false);
      expect(postStore.posts).toHaveLength(1);
    });
  });
});