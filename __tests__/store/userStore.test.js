// __tests__/store/userStore.test.js
/**
 * 用户状态管理测试
 */

const { userStore, USER_STATUS } = require('../../store/userStore');

describe('userStore 用户状态管理', () => {
  beforeEach(() => {
    // 重置store状态
    userStore.loginStatus = USER_STATUS.UNREGISTERED;
    userStore.userInfo = null;
    userStore.errorMessage = '';
    userStore.isLoading = false;
  });

  describe('状态初始化', () => {
    test('应该具有正确的初始状态', () => {
      expect(userStore.loginStatus).toBe(USER_STATUS.UNREGISTERED);
      expect(userStore.userInfo).toBeNull();
      expect(userStore.errorMessage).toBe('');
      expect(userStore.isLoading).toBe(false);
    });
  });

  describe('setStatus 方法', () => {
    test('设置登录状态应该更新相关数据', () => {
      const mockUserInfo = {
        _id: 'user123',
        username: '测试用户',
        avatar: 'http://example.com/avatar.jpg'
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: mockUserInfo });

      expect(userStore.loginStatus).toBe(USER_STATUS.LOGGEDIN);
      expect(userStore.userInfo).toEqual(mockUserInfo);
      expect(userStore.errorMessage).toBe('');
      expect(userStore.isLoading).toBe(false);
    });

    test('设置错误状态应该清空用户信息', () => {
      userStore.setStatus(USER_STATUS.ERROR, { message: '网络错误' });

      expect(userStore.loginStatus).toBe(USER_STATUS.ERROR);
      expect(userStore.userInfo).toBeNull();
      expect(userStore.errorMessage).toBe('网络错误');
    });

    test('设置未注册状态应该清空相关数据', () => {
      userStore.setStatus(USER_STATUS.UNREGISTERED);

      expect(userStore.loginStatus).toBe(USER_STATUS.UNREGISTERED);
      expect(userStore.userInfo).toBeNull();
      expect(userStore.errorMessage).toBe('');
    });
  });

  describe('计算属性', () => {
    test('isLoggedIn 应该正确反映登录状态', () => {
      expect(userStore.isLoggedIn).toBe(false);

      userStore.setStatus(USER_STATUS.LOGGEDIN, { 
        userInfo: { _id: 'test', username: 'test' } 
      });
      expect(userStore.isLoggedIn).toBe(true);
    });

    test('hasError 应该正确反映错误状态', () => {
      expect(userStore.hasError).toBe(false);

      userStore.setStatus(USER_STATUS.ERROR, { message: '错误' });
      expect(userStore.hasError).toBe(true);
    });

    test('displayName 应该返回正确的显示名称', () => {
      expect(userStore.displayName).toBe('未登录用户');

      userStore.setStatus(USER_STATUS.LOGGEDIN, { 
        userInfo: { _id: 'test', username: '小明' } 
      });
      expect(userStore.displayName).toBe('小明');
    });

    test('avatarUrl 应该返回正确的头像路径', () => {
      expect(userStore.avatarUrl).toBe('/images/default_avatar.png');

      userStore.setStatus(USER_STATUS.LOGGEDIN, { 
        userInfo: { 
          _id: 'test', 
          username: '小明', 
          avatar: 'http://example.com/avatar.jpg' 
        } 
      });
      expect(userStore.avatarUrl).toBe('http://example.com/avatar.jpg');
    });
  });

  describe('setLoading 方法', () => {
    test('应该正确设置加载状态', () => {
      userStore.setLoading(true, '正在加载...');

      expect(userStore.isLoading).toBe(true);
      expect(userStore.errorMessage).toBe('正在加载...');
    });

    test('应该正确清除加载状态', () => {
      userStore.setLoading(false);

      expect(userStore.isLoading).toBe(false);
      expect(userStore.errorMessage).toBe('');
    });
  });

  describe('updateUserInfo 方法', () => {
    test('已登录状态下应该能更新用户信息', () => {
      const initialUserInfo = {
        _id: 'user123',
        username: '小明',
        avatar: 'http://example.com/old-avatar.jpg'
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: initialUserInfo });

      const updateData = {
        username: '小红',
        avatar: 'http://example.com/new-avatar.jpg'
      };

      userStore.updateUserInfo(updateData);

      expect(userStore.userInfo.username).toBe('小红');
      expect(userStore.userInfo.avatar).toBe('http://example.com/new-avatar.jpg');
      expect(userStore.userInfo._id).toBe('user123'); // 保持不变
    });

    test('未登录状态下不应该更新用户信息', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      userStore.updateUserInfo({ username: '测试' });

      expect(userStore.userInfo).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ 只有已登录状态才能更新用户信息');

      consoleSpy.mockRestore();
    });
  });

  describe('logout 方法', () => {
    test('应该正确清除登录状态和本地存储', () => {
      const mockUserInfo = {
        _id: 'user123',
        username: '测试用户'
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: mockUserInfo });

      userStore.logout();

      expect(userStore.loginStatus).toBe(USER_STATUS.UNREGISTERED);
      expect(userStore.userInfo).toBeNull();
      expect(wx.removeStorageSync).toHaveBeenCalledWith('openid');
      expect(wx.removeStorageSync).toHaveBeenCalledWith('userInfo');
      expect(wx.showToast).toHaveBeenCalledWith({ 
        title: '已退出登录', 
        icon: 'success' 
      });
    });
  });
});