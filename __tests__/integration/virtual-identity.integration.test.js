// __tests__/integration/virtual-identity.integration.test.js
// 虚拟身份功能集成测试

const { userStore, USER_STATUS, IDENTITY_TYPE } = require('../../store/userStore');

// Mock 微信小程序API
global.wx = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  setStorage: jest.fn(),
  removeStorageSync: jest.fn(),
  showToast: jest.fn(),
  showModal: jest.fn(),
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  request: jest.fn()
};

// Mock getApp
global.getApp = jest.fn(() => ({
  globalData: {
    baseUrl: 'http://localhost:3000/api',
    loginStatus: 'loggedIn',
    userInfo: null
  },
  getUserStore: () => userStore
}));

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('虚拟身份功能集成测试', () => {
  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();
    
    // 重置 store 状态
    userStore.loginStatus = USER_STATUS.UNREGISTERED;
    userStore.userInfo = null;
    userStore.realUserInfo = null;
    userStore.currentIdentityType = IDENTITY_TYPE.REAL;
    userStore.virtualUsers = [];
    userStore.errorMessage = '';
    userStore.isLoading = false;
  });

  describe('管理员工作流程测试', () => {
    test('完整的管理员虚拟身份创建和切换流程', async () => {
      // 步骤1: 管理员登录
      const adminUser = {
        _id: 'admin123',
        username: 'admin',
        openid: 'admin_openid',
        avatar: 'admin_avatar.jpg',
        isAdmin: true
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });
      userStore.setRealUserInfo(adminUser);

      // 验证管理员状态
      expect(userStore.isAdmin).toBe(true);
      expect(userStore.isRealIdentity).toBe(true);

      // 步骤2: 模拟创建虚拟用户API调用
      const mockCreateResponse = {
        data: {
          user: {
            _id: 'virtual_new',
            username: 'test_virtual',
            openid: 'virtual_test_openid',
            avatar: 'virtual_test_avatar.jpg',
            isVirtual: true
          }
        }
      };

      // Mock API
      const mockApi = require('../../utils/api');
      mockApi.admin.createVirtualUser = jest.fn().mockResolvedValue(mockCreateResponse);

      // 创建虚拟用户
      const newVirtualUser = await userStore.createVirtualUser('test_virtual', 'virtual_test_avatar.jpg');

      expect(newVirtualUser).toEqual(mockCreateResponse.data.user);
      expect(userStore.virtualUsers).toContainEqual(mockCreateResponse.data.user);

      // 步骤3: 切换到虚拟身份
      userStore.switchToVirtualIdentity(newVirtualUser);

      expect(userStore.currentIdentityType).toBe(IDENTITY_TYPE.VIRTUAL);
      expect(userStore.userInfo).toEqual(newVirtualUser);
      expect(userStore.realUserInfo).toEqual(adminUser);
      expect(userStore.isVirtualIdentity).toBe(true);
      expect(userStore.isAdmin).toBe(true); // 管理员权限保持

      // 步骤4: 切换回管理员身份
      userStore.switchToRealIdentity();

      expect(userStore.currentIdentityType).toBe(IDENTITY_TYPE.REAL);
      expect(userStore.userInfo).toEqual(adminUser);
      expect(userStore.isRealIdentity).toBe(true);
    });

    test('管理员页面权限验证', () => {
      // 测试管理页面的权限检查逻辑（模拟management页面的onLoad）
      const checkManagementPageAccess = (isAdmin) => {
        if (!isAdmin) {
          wx.showModal({
            title: '权限不足',
            content: '需要管理员权限才能访问此页面',
            showCancel: false,
            success: () => {
              wx.navigateBack();
            }
          });
          return false;
        }
        return true;
      };

      // 管理员应该可以访问
      const adminUser = {
        _id: 'admin123',
        username: 'admin',
        openid: 'admin_openid',
        avatar: 'admin_avatar.jpg',
        isAdmin: true
      };
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });

      expect(checkManagementPageAccess(userStore.isAdmin)).toBe(true);
      expect(wx.showModal).not.toHaveBeenCalled();

      // 普通用户应该被拒绝
      const normalUser = {
        _id: 'user123',
        username: 'normaluser',
        openid: 'user_openid',
        avatar: 'user_avatar.jpg',
        isAdmin: false
      };
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: normalUser });

      expect(checkManagementPageAccess(userStore.isAdmin)).toBe(false);
      expect(wx.showModal).toHaveBeenCalledWith({
        title: '权限不足',
        content: '需要管理员权限才能访问此页面',
        showCancel: false,
        success: expect.any(Function)
      });
    });
  });

  describe('错误处理测试', () => {
    test('应该正确处理API错误', async () => {
      const adminUser = {
        _id: 'admin123',
        username: 'admin',
        openid: 'admin_openid',
        avatar: 'admin_avatar.jpg',
        isAdmin: true
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });

      // Mock API失败
      const mockApi = require('../../utils/api');
      mockApi.admin.createVirtualUser = jest.fn().mockRejectedValue(new Error('网络错误'));

      try {
        await userStore.createVirtualUser('test_user', 'test_avatar.jpg');
      } catch (error) {
        expect(error.message).toBe('网络错误');
      }

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '网络错误',
        icon: 'error'
      });
    });

    test('应该正确处理权限不足', () => {
      const normalUser = {
        _id: 'user123',
        username: 'normaluser',
        openid: 'user_openid',
        avatar: 'user_avatar.jpg',
        isAdmin: false
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: normalUser });

      // 尝试切换虚拟身份应该失败
      const virtualUser = {
        _id: 'virtual1',
        username: 'virtual_user1',
        openid: 'virtual_openid1',
        avatar: 'virtual_avatar1.jpg',
        isVirtual: true
      };

      userStore.switchToVirtualIdentity(virtualUser);

      // 状态应该保持不变
      expect(userStore.currentIdentityType).toBe(IDENTITY_TYPE.REAL);
      expect(userStore.userInfo).toEqual(normalUser);
    });
  });

  describe('数据一致性测试', () => {
    test('虚拟身份切换后数据应该保持一致', () => {
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

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });
      userStore.setRealUserInfo(adminUser);

      // 切换到虚拟身份
      userStore.switchToVirtualIdentity(virtualUser);

      // 检查关键状态
      expect(userStore.loginStatus).toBe(USER_STATUS.LOGGEDIN);
      expect(userStore.userInfo.openid).toBe(virtualUser.openid);
      expect(userStore.realUserInfo.openid).toBe(adminUser.openid);
      expect(userStore.isAdmin).toBe(true);

      // 切换回管理员身份
      userStore.switchToRealIdentity();

      expect(userStore.loginStatus).toBe(USER_STATUS.LOGGEDIN);
      expect(userStore.userInfo.openid).toBe(adminUser.openid);
      expect(userStore.isAdmin).toBe(true);
    });

    test('虚拟用户列表管理应该保持同步', async () => {
      const adminUser = {
        _id: 'admin123',
        username: 'admin',
        openid: 'admin_openid',
        avatar: 'admin_avatar.jpg',
        isAdmin: true
      };

      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo: adminUser });

      // Mock API
      const mockApi = require('../../utils/api');
      
      // 创建虚拟用户
      const virtualUser1 = {
        _id: 'virtual1',
        username: 'virtual_user1',
        openid: 'virtual_openid1',
        avatar: 'virtual_avatar1.jpg',
        isVirtual: true
      };

      mockApi.admin.createVirtualUser = jest.fn().mockResolvedValue({
        data: { user: virtualUser1 }
      });

      await userStore.createVirtualUser('virtual_user1', 'virtual_avatar1.jpg');
      expect(userStore.virtualUsers).toHaveLength(1);

      // 删除虚拟用户
      mockApi.admin.deleteVirtualUser = jest.fn().mockResolvedValue({});

      await userStore.deleteVirtualUser('virtual1');
      expect(userStore.virtualUsers).toHaveLength(0);
    });
  });
});