// __tests__/store/userStore.virtual-identity.test.js
// 虚拟身份管理功能测试

const { userStore, USER_STATUS, IDENTITY_TYPE } = require('../../store/userStore');

// Mock 微信小程序API
global.wx = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  setStorage: jest.fn(),
  removeStorageSync: jest.fn(),
  showToast: jest.fn(),
  request: jest.fn()
};

// Mock getApp
global.getApp = jest.fn(() => ({
  globalData: {
    baseUrl: 'http://localhost:3000/api',
    loginStatus: 'loggedIn',
    userInfo: null
  }
}));

// Mock API
jest.mock('../../utils/api', () => ({
  admin: {
    getVirtualUsers: jest.fn(),
    createVirtualUser: jest.fn(),
    deleteVirtualUser: jest.fn()
  }
}));

const mockApi = require('../../utils/api');

describe('虚拟身份管理功能测试', () => {
  beforeEach(() => {
    // 重置 store 状态
    userStore.loginStatus = USER_STATUS.UNREGISTERED;
    userStore.userInfo = null;
    userStore.realUserInfo = null;
    userStore.currentIdentityType = IDENTITY_TYPE.REAL;
    userStore.virtualUsers = [];
    userStore.errorMessage = '';
    userStore.isLoading = false;

    // 重置所有 mock
    jest.clearAllMocks();
  });

  describe('管理员身份检查', () => {
    test('应该正确识别管理员用户', () => {
      // 设置管理员用户信息
      const adminUser = {
        _id: 'admin123',
        username: 'admin',
        openid: 'admin_openid',
        avatar: 'admin_avatar.jpg',
        isAdmin: true
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });

      expect(userStore.isAdmin).toBe(true);
      expect(userStore.isRealIdentity).toBe(true);
      expect(userStore.isVirtualIdentity).toBe(false);
    });

    test('应该正确识别普通用户', () => {
      const normalUser = {
        _id: 'user123',
        username: 'normaluser',
        openid: 'user_openid',
        avatar: 'user_avatar.jpg',
        isAdmin: false
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: normalUser });

      expect(userStore.isAdmin).toBe(false);
      expect(userStore.isRealIdentity).toBe(true);
    });
  });

  describe('虚拟用户管理', () => {
    const adminUser = {
      _id: 'admin123',
      username: 'admin',
      openid: 'admin_openid',
      avatar: 'admin_avatar.jpg',
      isAdmin: true
    };

    beforeEach(() => {
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });
      userStore.setRealUserInfo(adminUser);
    });

    test('管理员应该能够加载虚拟用户列表', async () => {
      const mockVirtualUsers = [
        {
          _id: 'virtual1',
          username: 'virtual_user1',
          openid: 'virtual_openid1',
          avatar: 'virtual_avatar1.jpg',
          isVirtual: true,
          createdAt: '2023-01-01'
        }
      ];

      mockApi.admin.getVirtualUsers.mockResolvedValue({
        data: { users: mockVirtualUsers }
      });

      await userStore.loadVirtualUsers();

      expect(mockApi.admin.getVirtualUsers).toHaveBeenCalled();
      expect(userStore.virtualUsers).toEqual(mockVirtualUsers);
    });

    test('应该能够创建虚拟用户', async () => {
      const newVirtualUser = {
        _id: 'virtual_new',
        username: 'new_virtual_user',
        openid: 'virtual_new_openid',
        avatar: 'virtual_new_avatar.jpg',
        isVirtual: true
      };

      mockApi.admin.createVirtualUser.mockResolvedValue({
        data: { user: newVirtualUser }
      });

      const result = await userStore.createVirtualUser('new_virtual_user', 'virtual_new_avatar.jpg');

      expect(mockApi.admin.createVirtualUser).toHaveBeenCalledWith({
        username: 'new_virtual_user',
        avatar: 'virtual_new_avatar.jpg'
      });
      expect(userStore.virtualUsers).toContainEqual(newVirtualUser);
      expect(result).toEqual(newVirtualUser);
    });

    test('应该能够删除虚拟用户', async () => {
      // 先添加一个虚拟用户
      userStore.virtualUsers = [{
        _id: 'virtual_to_delete',
        username: 'to_delete',
        openid: 'delete_openid',
        avatar: 'delete_avatar.jpg',
        isVirtual: true
      }];

      mockApi.admin.deleteVirtualUser.mockResolvedValue({});

      await userStore.deleteVirtualUser('virtual_to_delete');

      expect(mockApi.admin.deleteVirtualUser).toHaveBeenCalledWith('virtual_to_delete');
      expect(userStore.virtualUsers).toHaveLength(0);
    });

    test('非管理员不应该能够管理虚拟用户', async () => {
      // 设置为普通用户（不包含admin字样，避免临时强制权限）
      const normalUser = {
        _id: 'user123',
        username: 'regularuser', // 修改用户名，避免触发临时管理员权限
        openid: 'user_openid',
        avatar: 'user_avatar.jpg',
        isAdmin: false
      };
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: normalUser });
      userStore.realUserInfo = null; // 确保没有真实管理员信息

      await userStore.loadVirtualUsers();
      
      expect(mockApi.admin.getVirtualUsers).not.toHaveBeenCalled();
    });
  });

  describe('身份切换功能', () => {
    const adminUser = {
      _id: 'admin123',
      username: 'admin',
      openid: 'admin_openid',
      avatar: 'admin_avatar.jpg',
      isAdmin: true
    };

    const virtualUser = {
      _id: 'virtual1',
      username: 'virtual_user1',
      openid: 'virtual_openid1',
      avatar: 'virtual_avatar1.jpg',
      isVirtual: true
    };

    beforeEach(() => {
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });
    });

    test('应该能够切换到虚拟身份', () => {
      userStore.switchToVirtualIdentity(virtualUser);

      expect(userStore.currentIdentityType).toBe(IDENTITY_TYPE.VIRTUAL);
      expect(userStore.userInfo).toEqual(virtualUser);
      expect(userStore.realUserInfo).toEqual(adminUser);
      expect(userStore.isVirtualIdentity).toBe(true);
      expect(userStore.isAdmin).toBe(true); // 仍然是管理员
    });

    test('应该能够切换回真实身份', () => {
      // 先切换到虚拟身份
      userStore.switchToVirtualIdentity(virtualUser);
      
      // 再切换回真实身份
      userStore.switchToRealIdentity();

      expect(userStore.currentIdentityType).toBe(IDENTITY_TYPE.REAL);
      expect(userStore.userInfo).toEqual(adminUser);
      expect(userStore.isRealIdentity).toBe(true);
      expect(userStore.isAdmin).toBe(true);
    });

    test('普通用户不应该能够切换身份', () => {
      const normalUser = {
        _id: 'user123',
        username: 'regularuser', // 修改用户名，避免触发临时管理员权限
        openid: 'user_openid',
        avatar: 'user_avatar.jpg',
        isAdmin: false
      };
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: normalUser });
      userStore.realUserInfo = null; // 确保没有真实管理员信息

      userStore.switchToVirtualIdentity(virtualUser);

      // 状态应该保持不变
      expect(userStore.currentIdentityType).toBe(IDENTITY_TYPE.REAL);
      expect(userStore.userInfo).toEqual(normalUser);
    });
  });

  describe('身份显示信息', () => {
    test('应该正确返回当前身份信息', () => {
      const adminUser = {
        _id: 'admin123',
        username: 'admin',
        openid: 'admin_openid',
        avatar: 'admin_avatar.jpg',
        isAdmin: true
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });

      const identityInfo = userStore.currentIdentityInfo;

      expect(identityInfo.type).toBe(IDENTITY_TYPE.REAL);
      expect(identityInfo.user).toEqual(adminUser);
      expect(identityInfo.isAdmin).toBe(true);
      expect(identityInfo.isVirtual).toBe(false);
    });

    test('应该正确返回管理员展示信息', () => {
      const adminUser = {
        _id: 'admin123',
        username: 'admin',
        openid: 'admin_openid',
        avatar: 'admin_avatar.jpg',
        isAdmin: true
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });
      userStore.setRealUserInfo(adminUser);
      userStore.virtualUsers = [{ _id: 'v1' }, { _id: 'v2' }];

      const adminInfo = userStore.adminDisplayInfo;

      expect(adminInfo.realUser).toEqual(adminUser);
      expect(adminInfo.currentUser).toEqual(adminUser);
      expect(adminInfo.identityType).toBe(IDENTITY_TYPE.REAL);
      expect(adminInfo.virtualUsersCount).toBe(2);
    });

    test('普通用户不应该有管理员展示信息', () => {
      const normalUser = {
        _id: 'user123',
        username: 'regularuser', // 修改用户名，避免触发临时管理员权限
        openid: 'user_openid',
        avatar: 'user_avatar.jpg',
        isAdmin: false
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: normalUser });
      userStore.realUserInfo = null; // 确保没有真实管理员信息

      expect(userStore.adminDisplayInfo).toBeNull();
    });
  });
});