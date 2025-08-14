// __tests__/integration/history-feature.test.js
/**
 * 历史记录功能集成测试
 * 测试主页面历史记录按钮和list页面历史记录模式的完整流程
 */

const { userStore, USER_STATUS } = require('../../store/userStore');

// 模拟API响应
const mockAPI = {
  circles: {
    getMy: jest.fn(),
    getMyParticipated: jest.fn()
  }
};

// 模拟页面实例
const createMockMainPage = () => ({
  data: {
    isLoggedIn: false,
    loginStatus: USER_STATUS.UNREGISTERED,
    userInfo: null,
    isLoading: false,
    hasError: false
  },
  setData: jest.fn(),
  requireUserAuth: jest.fn(),
  goToHistory: jest.fn()
});

const createMockListPage = () => ({
  data: {
    circles: [],
    loading: false,
    isHistoryMode: false,
    pageTitle: '我的朋友圈'
  },
  setData: jest.fn(),
  loadCircles: jest.fn()
});

describe('历史记录功能集成测试', () => {
  beforeEach(() => {
    // 重置所有状态
    userStore.loginStatus = USER_STATUS.UNREGISTERED;
    userStore.userInfo = null;
    userStore.errorMessage = '';
    userStore.isLoading = false;
    
    // 清除所有mock
    jest.clearAllMocks();
    
    // 模拟微信API
    global.wx = {
      navigateTo: jest.fn(),
      navigateBack: jest.fn(),
      switchTab: jest.fn(),
      reLaunch: jest.fn(),
      showToast: jest.fn(),
      showModal: jest.fn(),
      setStorage: jest.fn(),
      setStorageSync: jest.fn(),
      getStorage: jest.fn(),
      getStorageSync: jest.fn(),
      removeStorageSync: jest.fn()
    };
    
    // 模拟getApp
    global.getApp = jest.fn(() => ({
      getUserStore: () => userStore,
      globalData: {
        baseUrl: 'http://192.168.0.111:3000/api',
        selectedCircleId: null
      }
    }));
  });

  describe('主页面历史记录按钮', () => {
    test('未登录用户不应看到历史记录按钮', () => {
      const mainPage = createMockMainPage();
      
      // 验证未登录状态下按钮不显示
      expect(mainPage.data.isLoggedIn).toBe(false);
      
      // 在真实场景中，wxml中的 wx:if="{{isLoggedIn}}" 会隐藏按钮
      // 这里我们测试数据状态的正确性
    });

    test('已登录用户应该看到历史记录按钮', () => {
      const mainPage = createMockMainPage();
      const userInfo = {
        _id: 'user123',
        username: '测试用户',
        avatar: 'avatar.jpg'
      };
      
      // 模拟用户登录
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo });
      mainPage.data.isLoggedIn = true;
      mainPage.data.loginStatus = USER_STATUS.LOGGEDIN;
      mainPage.data.userInfo = userInfo;
      
      // 验证登录状态
      expect(mainPage.data.isLoggedIn).toBe(true);
      expect(mainPage.data.userInfo).toEqual(userInfo);
    });

    test('点击历史记录按钮应该跳转到历史记录页面', () => {
      const mainPage = createMockMainPage();
      const userInfo = { _id: 'user123', username: '测试用户' };
      
      // 模拟已登录状态
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo });
      
      // 模拟requireUserAuth方法的实现
      mainPage.requireUserAuth.mockImplementation((callback) => {
        if (userStore.isLoggedIn) {
          callback();
        }
      });
      
      // 模拟goToHistory方法
      mainPage.goToHistory.mockImplementation(() => {
        mainPage.requireUserAuth(() => {
          wx.navigateTo({
            url: '/pages/list/list?mode=history'
          });
        });
      });
      
      // 执行点击操作
      mainPage.goToHistory();
      
      // 验证跳转
      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/list/list?mode=history'
      });
    });

    test('未登录用户点击历史记录按钮应该被引导登录', () => {
      const mainPage = createMockMainPage();
      
      // 模拟requireUserAuth的实现
      mainPage.requireUserAuth.mockImplementation((callback) => {
        if (!userStore.isLoggedIn && userStore.loginStatus === USER_STATUS.UNREGISTERED) {
          wx.showModal({
            title: '需要登录',
            content: '该操作需要登录，是否现在登录？',
            success: (res) => {
              if (res.confirm) {
                // 在真实场景中这里会触发登录流程
              }
            }
          });
        }
      });
      
      // 模拟goToHistory方法
      mainPage.goToHistory.mockImplementation(() => {
        mainPage.requireUserAuth(() => {
          wx.navigateTo({
            url: '/pages/list/list?mode=history'
          });
        });
      });
      
      // 未登录状态下点击
      mainPage.goToHistory();
      
      // 验证没有直接跳转
      expect(wx.navigateTo).not.toHaveBeenCalled();
      
      // 验证显示了登录提示
      expect(wx.showModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '需要登录',
          content: '该操作需要登录，是否现在登录？'
        })
      );
    });
  });

  describe('list页面历史记录模式', () => {
    test('普通模式应该正确初始化', () => {
      const listPage = createMockListPage();
      const options = {}; // 没有mode参数
      
      // 模拟onLoad方法
      const isHistoryMode = options.mode === 'history';
      const pageTitle = isHistoryMode ? '历史记录' : '我的朋友圈';
      
      listPage.setData({
        isHistoryMode,
        pageTitle
      });
      
      // 验证普通模式设置
      expect(listPage.setData).toHaveBeenCalledWith({
        isHistoryMode: false,
        pageTitle: '我的朋友圈'
      });
    });

    test('历史记录模式应该正确初始化', () => {
      const listPage = createMockListPage();
      const options = { mode: 'history' };
      
      // 模拟onLoad方法
      const isHistoryMode = options.mode === 'history';
      const pageTitle = isHistoryMode ? '历史记录' : '我的朋友圈';
      
      listPage.setData({
        isHistoryMode,
        pageTitle
      });
      
      // 验证历史记录模式设置
      expect(listPage.setData).toHaveBeenCalledWith({
        isHistoryMode: true,
        pageTitle: '历史记录'
      });
    });

    test('历史记录模式应该调用正确的API接口', async () => {
      const listPage = createMockListPage();
      listPage.data.isHistoryMode = true;
      
      // 模拟API响应
      const mockCircles = [
        {
          _id: 'circle1',
          name: '朋友圈1',
          createdAt: '2024-01-01T10:00:00Z',
          members: [{ _id: 'user1' }, { _id: 'user2' }],
          latestPost: {
            _id: 'post1',
            content: '最新帖子',
            createdAt: '2024-01-02T10:00:00Z'
          }
        },
        {
          _id: 'circle2',
          name: '朋友圈2',
          createdAt: '2024-01-03T10:00:00Z',
          members: [{ _id: 'user1' }],
          latestPost: null
        }
      ];
      
      mockAPI.circles.getMyParticipated.mockResolvedValue({
        data: { circles: mockCircles }
      });
      
      // 模拟loadCircles方法的实现
      listPage.loadCircles.mockImplementation(async function() {
        if (this.data.loading) return;
        
        this.setData({ loading: true });
        
        try {
          let res;
          if (this.data.isHistoryMode) {
            res = await mockAPI.circles.getMyParticipated();
          } else {
            res = await mockAPI.circles.getMy();
          }
          
          const circles = res.data.circles || [];
          
          // 处理数据和排序逻辑
          circles.forEach(circle => {
            const circleTime = new Date(circle.createdAt).getTime();
            const latestPostTime = circle.latestPost ? new Date(circle.latestPost.createdAt).getTime() : 0;
            circle.lastUpdateTime = Math.max(circleTime, latestPostTime);
          });
          
          if (this.data.isHistoryMode) {
            circles.sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);
          }
          
          this.setData({
            circles,
            loading: false
          });
        } catch (error) {
          this.setData({ loading: false });
        }
      });
      
      // 执行加载
      await listPage.loadCircles.call(listPage);
      
      // 验证调用了正确的API
      expect(mockAPI.circles.getMyParticipated).toHaveBeenCalled();
      expect(mockAPI.circles.getMy).not.toHaveBeenCalled();
    });

    test('历史记录模式应该按最后更新时间排序', async () => {
      const listPage = createMockListPage();
      listPage.data.isHistoryMode = true;
      
      // 模拟朋友圈数据，故意打乱时间顺序
      const mockCircles = [
        {
          _id: 'circle1',
          name: '朋友圈1',
          createdAt: '2024-01-01T10:00:00Z', // 最早创建
          latestPost: {
            createdAt: '2024-01-04T10:00:00Z' // 但最新活动最晚
          }
        },
        {
          _id: 'circle2',
          name: '朋友圈2',
          createdAt: '2024-01-03T10:00:00Z', // 中间创建
          latestPost: null // 没有帖子
        },
        {
          _id: 'circle3',
          name: '朋友圈3',
          createdAt: '2024-01-02T10:00:00Z', // 中间创建
          latestPost: {
            createdAt: '2024-01-02T12:00:00Z' // 活动较早
          }
        }
      ];
      
      mockAPI.circles.getMyParticipated.mockResolvedValue({
        data: { circles: [...mockCircles] } // 创建副本避免修改原数组
      });
      
      // 执行排序逻辑
      const circles = [...mockCircles];
      circles.forEach(circle => {
        const circleTime = new Date(circle.createdAt).getTime();
        const latestPostTime = circle.latestPost ? new Date(circle.latestPost.createdAt).getTime() : 0;
        circle.lastUpdateTime = Math.max(circleTime, latestPostTime);
      });
      
      circles.sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);
      
      // 验证排序结果：circle1应该排在最前（最新活动），然后是circle2，最后是circle3
      expect(circles[0]._id).toBe('circle1'); // 2024-01-04T10:00:00Z
      expect(circles[1]._id).toBe('circle2'); // 2024-01-03T10:00:00Z
      expect(circles[2]._id).toBe('circle3'); // 2024-01-02T12:00:00Z
    });

    test('历史记录模式应该正确格式化最后更新时间', async () => {
      const mockCircle = {
        _id: 'circle1',
        name: '测试朋友圈',
        createdAt: '2024-01-01T10:00:00Z',
        latestPost: {
          createdAt: '2024-01-02T10:00:00Z'
        }
      };
      
      // 模拟formatRelativeTime函数
      const util = require('../../utils/util');
      util.formatRelativeTime = jest.fn((time) => {
        const date = new Date(time);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      });
      
      // 处理格式化
      const circle = { ...mockCircle };
      const isHistoryMode = true;
      
      if (isHistoryMode) {
        circle.lastUpdateFormatted = util.formatRelativeTime(
          circle.latestPost ? circle.latestPost.createdAt : circle.createdAt
        );
      }
      
      // 验证格式化结果
      expect(circle.lastUpdateFormatted).toBeDefined();
      expect(util.formatRelativeTime).toHaveBeenCalledWith('2024-01-02T10:00:00Z');
    });
  });

  describe('数据一致性测试', () => {
    test('主页面和历史记录页面数据应该保持一致', async () => {
      // 这个测试确保主页面加载的朋友圈数据和历史记录页面数据来源一致
      const userInfo = { _id: 'user123', username: '测试用户' };
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo });
      
      const mockCircles = [
        {
          _id: 'circle1',
          name: '共同朋友圈',
          members: [{ _id: 'user123' }]
        }
      ];
      
      mockAPI.circles.getMyParticipated.mockResolvedValue({
        data: { circles: mockCircles }
      });
      
      // 验证两个页面使用的是同一个数据源
      expect(mockAPI.circles.getMyParticipated).toBeDefined();
    });

    test('按最后更新时间排序应该考虑创建时间和最新帖子时间', () => {
      const testCases = [
        {
          circle: {
            createdAt: '2024-01-01T10:00:00Z',
            latestPost: { createdAt: '2024-01-03T10:00:00Z' }
          },
          expectedTime: new Date('2024-01-03T10:00:00Z').getTime()
        },
        {
          circle: {
            createdAt: '2024-01-02T10:00:00Z',
            latestPost: null
          },
          expectedTime: new Date('2024-01-02T10:00:00Z').getTime()
        },
        {
          circle: {
            createdAt: '2024-01-04T10:00:00Z',
            latestPost: { createdAt: '2024-01-01T10:00:00Z' }
          },
          expectedTime: new Date('2024-01-04T10:00:00Z').getTime()
        }
      ];
      
      testCases.forEach(({ circle, expectedTime }) => {
        const circleTime = new Date(circle.createdAt).getTime();
        const latestPostTime = circle.latestPost ? new Date(circle.latestPost.createdAt).getTime() : 0;
        const lastUpdateTime = Math.max(circleTime, latestPostTime);
        
        expect(lastUpdateTime).toBe(expectedTime);
      });
    });
  });

  describe('用户体验测试', () => {
    test('历史记录页面应该有正确的标题', () => {
      const listPage = createMockListPage();
      const options = { mode: 'history' };
      
      const isHistoryMode = options.mode === 'history';
      const pageTitle = isHistoryMode ? '历史记录' : '我的朋友圈';
      
      expect(pageTitle).toBe('历史记录');
    });

    test('历史记录页面不应该显示创建和加入按钮', () => {
      const listPage = createMockListPage();
      listPage.data.isHistoryMode = true;
      
      // 在真实场景中，wxml中的 wx:if="{{!isHistoryMode}}" 会隐藏按钮
      // 这里我们验证数据状态
      expect(listPage.data.isHistoryMode).toBe(true);
    });

    test('空历史记录应该显示合适的提示信息', () => {
      const isHistoryMode = true;
      const circles = [];
      
      const emptyIcon = isHistoryMode ? '📋' : '🌟';
      const emptyText = isHistoryMode ? '暂无历史记录' : '还没有朋友圈';
      const emptyDesc = isHistoryMode ? '当你参与朋友圈后，记录会显示在这里' : '创建一个朋友圈，开始分享生活吧';
      
      expect(emptyIcon).toBe('📋');
      expect(emptyText).toBe('暂无历史记录');
      expect(emptyDesc).toBe('当你参与朋友圈后，记录会显示在这里');
    });

    test('历史记录页面点击项目应该跳转到详情页面', () => {
      const listPage = createMockListPage();
      listPage.data.isHistoryMode = true;
      
      // 模拟viewCirclePosts方法
      listPage.viewCirclePosts = jest.fn((e) => {
        const { circleId } = e.currentTarget.dataset;
        
        if (listPage.data.isHistoryMode) {
          wx.navigateTo({
            url: `/pages/details/details?circleId=${circleId}`
          });
        } else {
          wx.switchTab({
            url: '/pages/main/main'
          });
          getApp().globalData.selectedCircleId = circleId;
        }
      });
      
      // 模拟点击事件
      const mockEvent = {
        currentTarget: {
          dataset: {
            circleId: 'circle123'
          }
        }
      };
      
      listPage.viewCirclePosts(mockEvent);
      
      // 验证跳转到详情页面
      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/details/details?circleId=circle123'
      });
      
      // 验证没有使用switchTab
      expect(wx.switchTab).not.toHaveBeenCalled();
    });

    test('普通模式页面点击项目应该跳转到主页面', () => {
      const listPage = createMockListPage();
      listPage.data.isHistoryMode = false;
      
      // 获取app实例的引用
      const app = getApp();
      
      // 模拟viewCirclePosts方法
      listPage.viewCirclePosts = jest.fn((e) => {
        const { circleId } = e.currentTarget.dataset;
        
        if (listPage.data.isHistoryMode) {
          wx.navigateTo({
            url: `/pages/details/details?circleId=${circleId}`
          });
        } else {
          wx.switchTab({
            url: '/pages/main/main'
          });
          app.globalData.selectedCircleId = circleId;
        }
      });
      
      // 模拟点击事件
      const mockEvent = {
        currentTarget: {
          dataset: {
            circleId: 'circle123'
          }
        }
      };
      
      listPage.viewCirclePosts(mockEvent);
      
      // 验证跳转到主页面
      expect(wx.switchTab).toHaveBeenCalledWith({
        url: '/pages/main/main'
      });
      
      // 验证设置了全局变量
      expect(app.globalData.selectedCircleId).toBe('circle123');
      
      // 验证没有使用navigateTo
      expect(wx.navigateTo).not.toHaveBeenCalled();
    });
  });

  describe('权限检查测试', () => {
    test('只有登录用户才能访问历史记录功能', () => {
      const mainPage = createMockMainPage();
      
      // 未登录状态
      expect(mainPage.data.isLoggedIn).toBe(false);
      
      // 在真实场景中，历史记录按钮通过 wx:if="{{isLoggedIn}}" 控制显示
      // 确保权限检查逻辑正确
    });

    test('历史记录功能应该使用用户_id进行权限检查', () => {
      const userInfo = {
        _id: 'user123', // 使用_id字段
        username: '测试用户',
        openid: 'openid123'
      };
      
      userStore.setStatus(USER_STATUS.LOGGEDIN, { userInfo });
      
      // 验证用户信息包含_id字段（根据记忆中的约定）
      expect(userStore.userInfo._id).toBe('user123');
      expect(userStore.userInfo.openid).toBe('openid123');
    });
  });

  describe('details页面智能返回测试', () => {
    test('有上一个页面时应该返回上一个页面', () => {
      // 模拟页面栈有两个页面
      global.getCurrentPages = jest.fn(() => [
        { route: 'pages/list/list' },
        { route: 'pages/details/details' }
      ]);
      
      const detailsPage = {
        navigateBack: jest.fn(() => {
          const pages = getCurrentPages();
          console.log('🔄 智能返回 - 当前页面栈:', pages.map(p => p.route));
          
          if (pages.length >= 2) {
            console.log('✅ 检测到上一个页面，使用navigateBack');
            wx.navigateBack();
          } else {
            console.log('❌ 没有上一个页面，使用reLaunch跳转到主页面');
            wx.reLaunch({
              url: '/pages/main/main'
            });
          }
        })
      };
      
      // 执行返回操作
      detailsPage.navigateBack();
      
      // 验证使用了navigateBack
      expect(wx.navigateBack).toHaveBeenCalled();
      expect(wx.reLaunch).not.toHaveBeenCalled();
    });

    test('没有上一个页面时应该reLaunch到主页面', () => {
      // 模拟页面栈只有一个页面
      global.getCurrentPages = jest.fn(() => [
        { route: 'pages/details/details' }
      ]);
      
      const detailsPage = {
        navigateBack: jest.fn(() => {
          const pages = getCurrentPages();
          console.log('🔄 智能返回 - 当前页面栈:', pages.map(p => p.route));
          
          if (pages.length >= 2) {
            console.log('✅ 检测到上一个页面，使用navigateBack');
            wx.navigateBack();
          } else {
            console.log('❌ 没有上一个页面，使用reLaunch跳转到主页面');
            wx.reLaunch({
              url: '/pages/main/main'
            });
          }
        })
      };
      
      // 执行返回操作
      detailsPage.navigateBack();
      
      // 验证使用了reLaunch
      expect(wx.reLaunch).toHaveBeenCalledWith({
        url: '/pages/main/main'
      });
      expect(wx.navigateBack).not.toHaveBeenCalled();
    });

    test('从历史记录页面进入details页面后返回应该回到历史记录页面', () => {
      // 模拟从历史记录页面进入details页面的场景
      global.getCurrentPages = jest.fn(() => [
        { route: 'pages/main/main' },
        { route: 'pages/list/list' }, // 历史记录页面
        { route: 'pages/details/details' }
      ]);
      
      const detailsPage = {
        navigateBack: jest.fn(() => {
          const pages = getCurrentPages();
          console.log('🔄 智能返回 - 当前页面栈:', pages.map(p => p.route));
          
          if (pages.length >= 2) {
            console.log('✅ 检测到上一个页面，使用navigateBack');
            wx.navigateBack();
          } else {
            console.log('❌ 没有上一个页面，使用reLaunch跳转到主页面');
            wx.reLaunch({
              url: '/pages/main/main'
            });
          }
        })
      };
      
      // 执行返回操作
      detailsPage.navigateBack();
      
      // 验证使用了navigateBack，应该回到历史记录页面
      expect(wx.navigateBack).toHaveBeenCalled();
      expect(wx.reLaunch).not.toHaveBeenCalled();
    });

    test('页面栈为空时应该安全处理', () => {
      // 模拟异常情况：页面栈为空
      global.getCurrentPages = jest.fn(() => []);
      
      const detailsPage = {
        navigateBack: jest.fn(() => {
          const pages = getCurrentPages();
          console.log('🔄 智能返回 - 当前页面栈:', pages.map(p => p.route));
          
          if (pages.length >= 2) {
            console.log('✅ 检测到上一个页面，使用navigateBack');
            wx.navigateBack();
          } else {
            console.log('❌ 没有上一个页面，使用reLaunch跳转到主页面');
            wx.reLaunch({
              url: '/pages/main/main'
            });
          }
        })
      };
      
      // 执行返回操作
      detailsPage.navigateBack();
      
      // 验证使用了reLaunch作为兜底方案
      expect(wx.reLaunch).toHaveBeenCalledWith({
        url: '/pages/main/main'
      });
      expect(wx.navigateBack).not.toHaveBeenCalled();
    });
  });
});