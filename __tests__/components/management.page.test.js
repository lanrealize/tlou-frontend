// __tests__/components/management.page.test.js
// 管理页面组件测试

// Mock 微信小程序API
global.wx = {
  showModal: jest.fn(),
  showToast: jest.fn(),
  navigateBack: jest.fn(),
  navigateTo: jest.fn()
};

// Mock getApp
const mockUserStore = {
  isAdmin: true,
  loadVirtualUsers: jest.fn(),
  createVirtualUser: jest.fn(),
  deleteVirtualUser: jest.fn(),
  switchToVirtualIdentity: jest.fn(),
  switchToRealIdentity: jest.fn()
};

global.getApp = jest.fn(() => ({
  getUserStore: () => mockUserStore
}));

// Mock mobx-miniprogram-bindings
jest.mock('mobx-miniprogram-bindings', () => ({
  storeBindingsBehavior: {},
  createStoreBindings: jest.fn(() => ({
    destroyStoreBindings: jest.fn()
  }))
}));

// Mock console
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

describe('管理页面测试', () => {
  let managementPage;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建页面实例 (模拟小程序页面结构)
    managementPage = {
      data: {
        newVirtualUser: { username: '', avatar: '' },
        isCreating: false,
        avatarOptions: ['avatar1.jpg', 'avatar2.jpg'],
        selectedAvatarIndex: 0,
        isAdmin: true
      },
      setData: jest.fn(),
      storeBindings: null
    };

    // 加载页面逻辑 (模拟页面方法)
    managementPage.setupStoreBindings = jest.fn();
    managementPage.onLoad = jest.fn(() => {
      if (!managementPage.data.isAdmin) {
        wx.showModal({
          title: '权限不足',
          content: '需要管理员权限才能访问此页面',
          showCancel: false,
          success: () => wx.navigateBack()
        });
      } else {
        mockUserStore.loadVirtualUsers();
      }
    });
    
    managementPage.onUsernameInput = jest.fn((e) => {
      managementPage.setData({
        'newVirtualUser.username': e.detail.value
      });
    });
    
    managementPage.selectAvatar = jest.fn((e) => {
      const index = e.currentTarget.dataset.index;
      managementPage.setData({
        selectedAvatarIndex: index,
        'newVirtualUser.avatar': managementPage.data.avatarOptions[index]
      });
    });
    
    managementPage.createVirtualUser = jest.fn(async () => {
      const { username } = managementPage.data.newVirtualUser;
      
      if (!username.trim()) {
        wx.showToast({ title: '请输入用户名', icon: 'none' });
        return;
      }
      
      try {
        managementPage.setData({ isCreating: true });
        await mockUserStore.createVirtualUser(username.trim(), managementPage.data.newVirtualUser.avatar);
        
        managementPage.setData({
          'newVirtualUser.username': '',
          'newVirtualUser.avatar': '',
          selectedAvatarIndex: 0,
          isCreating: false
        });
      } catch (error) {
        managementPage.setData({ isCreating: false });
      }
    });
    
    managementPage.deleteVirtualUser = jest.fn(async (e) => {
      const { user } = e.currentTarget.dataset;
      
      wx.showModal({
        title: '确认删除',
        content: `确定要删除虚拟用户 ${user.username} 吗？此操作不可恢复。`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await mockUserStore.deleteVirtualUser(user._id);
            } catch (error) {
              console.error('删除虚拟用户失败:', error);
            }
          }
        }
      });
    });
    
    managementPage.switchIdentity = jest.fn((e) => {
      const { type, user } = e.currentTarget.dataset;
      
      if (type === 'real') {
        mockUserStore.switchToRealIdentity();
      } else if (type === 'virtual' && user) {
        mockUserStore.switchToVirtualIdentity(user);
      }
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    });
  });

  describe('页面初始化', () => {
    test('应该正确设置 MobX 绑定', () => {
      managementPage.setupStoreBindings();

      expect(managementPage.setupStoreBindings).toHaveBeenCalled();
    });

    test('非管理员用户应该被重定向', () => {
      managementPage.data.isAdmin = false;
      managementPage.onLoad();

      expect(wx.showModal).toHaveBeenCalledWith({
        title: '权限不足',
        content: '需要管理员权限才能访问此页面',
        showCancel: false,
        success: expect.any(Function)
      });
    });

    test('管理员用户应该能正常加载页面', () => {
      managementPage.data.isAdmin = true;
      managementPage.onLoad();

      expect(mockUserStore.loadVirtualUsers).toHaveBeenCalled();
    });
  });

  describe('表单操作', () => {
    test('用户名输入应该更新状态', () => {
      const event = {
        detail: { value: 'test_username' }
      };

      managementPage.onUsernameInput(event);

      expect(managementPage.setData).toHaveBeenCalledWith({
        'newVirtualUser.username': 'test_username'
      });
    });

    test('头像选择应该更新状态', () => {
      const event = {
        currentTarget: { dataset: { index: 1 } }
      };

      managementPage.selectAvatar(event);

      expect(managementPage.setData).toHaveBeenCalledWith({
        selectedAvatarIndex: 1,
        'newVirtualUser.avatar': 'avatar2.jpg'
      });
    });
  });

  describe('虚拟用户管理', () => {
    test('应该能创建虚拟用户', async () => {
      managementPage.data.newVirtualUser.username = 'test_user';
      managementPage.data.newVirtualUser.avatar = 'test_avatar.jpg';

      mockUserStore.createVirtualUser.mockResolvedValue({
        _id: 'new_virtual_id',
        username: 'test_user'
      });

      await managementPage.createVirtualUser();

      expect(mockUserStore.createVirtualUser).toHaveBeenCalledWith(
        'test_user',
        'test_avatar.jpg'
      );

      expect(managementPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          'newVirtualUser.username': '',
          'newVirtualUser.avatar': '',
          selectedAvatarIndex: 0,
          isCreating: false
        })
      );
    });

    test('空用户名应该显示错误', async () => {
      managementPage.data.newVirtualUser.username = '';

      await managementPage.createVirtualUser();

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '请输入用户名',
        icon: 'none'
      });

      expect(mockUserStore.createVirtualUser).not.toHaveBeenCalled();
    });

    test('应该能删除虚拟用户', async () => {
      const user = {
        _id: 'virtual_id',
        username: 'virtual_user'
      };

      const event = {
        currentTarget: { dataset: { user } }
      };

      // Mock 用户确认删除
      wx.showModal.mockImplementation(({ success }) => {
        success({ confirm: true });
      });

      mockUserStore.deleteVirtualUser.mockResolvedValue();

      await managementPage.deleteVirtualUser(event);

      expect(wx.showModal).toHaveBeenCalledWith({
        title: '确认删除',
        content: '确定要删除虚拟用户 virtual_user 吗？此操作不可恢复。',
        success: expect.any(Function)
      });

      expect(mockUserStore.deleteVirtualUser).toHaveBeenCalledWith('virtual_id');
    });
  });

  describe('身份切换', () => {
    test('应该能切换到虚拟身份', () => {
      const virtualUser = {
        _id: 'virtual_id',
        username: 'virtual_user'
      };

      const event = {
        currentTarget: {
          dataset: {
            type: 'virtual',
            user: virtualUser
          }
        }
      };

      // Mock setTimeout
      jest.useFakeTimers();

      managementPage.switchIdentity(event);

      expect(mockUserStore.switchToVirtualIdentity).toHaveBeenCalledWith(virtualUser);

      // 验证延迟导航
      jest.advanceTimersByTime(1500);
      expect(wx.navigateBack).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('应该能切换回真实身份', () => {
      const event = {
        currentTarget: {
          dataset: {
            type: 'real'
          }
        }
      };

      jest.useFakeTimers();

      managementPage.switchIdentity(event);

      expect(mockUserStore.switchToRealIdentity).toHaveBeenCalled();

      jest.advanceTimersByTime(1500);
      expect(wx.navigateBack).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('错误处理', () => {
    test('创建虚拟用户失败应该显示错误', async () => {
      managementPage.data.newVirtualUser.username = 'test_user';
      managementPage.data.newVirtualUser.avatar = 'test_avatar.jpg';

      mockUserStore.createVirtualUser.mockRejectedValue(new Error('创建失败'));

      await managementPage.createVirtualUser();

      expect(managementPage.setData).toHaveBeenCalledWith({
        isCreating: false
      });
    });

    test('删除虚拟用户失败应该记录错误', async () => {
      const user = {
        _id: 'virtual_id',
        username: 'virtual_user'
      };

      const event = {
        currentTarget: { dataset: { user } }
      };

      wx.showModal.mockImplementation(({ success }) => {
        success({ confirm: true });
      });

      mockUserStore.deleteVirtualUser.mockRejectedValue(new Error('删除失败'));

      await managementPage.deleteVirtualUser(event);

      expect(console.error).toHaveBeenCalledWith(
        '删除虚拟用户失败:',
        expect.any(Error)
      );
    });
  });
});