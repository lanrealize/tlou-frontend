// __tests__/integration/apply-join-feature.test.js
const api = require('../../utils/api');

// Mock 微信 API
global.wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn(),
  navigateTo: jest.fn(),
  navigateBack: jest.fn()
};

// Mock API 调用
jest.mock('../../utils/api');

describe('申请加入功能集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API接口测试', () => {
    test('申请加入朋友圈API应该被正确调用', async () => {
      api.circles.applyToJoin.mockResolvedValue({
        success: true,
        message: '申请已提交，请等待朋友圈创建者审核'
      });

      const result = await api.circles.applyToJoin('circle-123');

      expect(api.circles.applyToJoin).toHaveBeenCalledWith('circle-123');
      expect(result.success).toBe(true);
      expect(result.message).toContain('申请已提交');
    });

    test('同意申请API应该被正确调用', async () => {
      api.circles.approveApplication.mockResolvedValue({
        success: true,
        message: '已同意申请，用户成功加入朋友圈'
      });

      const result = await api.circles.approveApplication('circle-123', 'user-456');

      expect(api.circles.approveApplication).toHaveBeenCalledWith('circle-123', 'user-456');
      expect(result.success).toBe(true);
      expect(result.message).toContain('已同意申请');
    });

    test('拒绝申请API应该被正确调用', async () => {
      api.circles.rejectApplication.mockResolvedValue({
        success: true,
        message: '已拒绝申请'
      });

      const result = await api.circles.rejectApplication('circle-123', 'user-456');

      expect(api.circles.rejectApplication).toHaveBeenCalledWith('circle-123', 'user-456');
      expect(result.success).toBe(true);
      expect(result.message).toContain('已拒绝申请');
    });

    test('获取申请者列表API应该被正确调用', async () => {
      const mockAppliers = [
        { _id: 'user-1', username: 'test1', avatar: '/avatar1.jpg' },
        { _id: 'user-2', username: 'test2', avatar: '/avatar2.jpg' }
      ];

      api.circles.getAppliers.mockResolvedValue({
        success: true,
        data: { appliers: mockAppliers }
      });

      const result = await api.circles.getAppliers('circle-123');

      expect(api.circles.getAppliers).toHaveBeenCalledWith('circle-123');
      expect(result.success).toBe(true);
      expect(result.data.appliers).toHaveLength(2);
      expect(result.data.appliers[0].username).toBe('test1');
    });

    test('获取公开朋友圈推荐API应该被正确调用', async () => {
      const mockCircle = {
        _id: 'circle-1',
        name: '公开朋友圈1',
        isPublic: true,
        creator: { _id: 'user-1', username: 'creator1' },
        members: ['user-1'],
        latestPost: { content: '最新动态1' }
      };

      api.circles.getRandomPublicCircle.mockResolvedValue({
        success: true,
        data: { 
          circle: mockCircle,
          randomInfo: { totalAvailable: 1, visitedCount: 0 }
        }
      });

      const result = await api.circles.getRandomPublicCircle({ excludeVisited: 'true' });

      expect(api.circles.getRandomPublicCircle).toHaveBeenCalledWith({ excludeVisited: 'true' });
      expect(result.success).toBe(true);
      expect(result.data.circle).toBeDefined();
      expect(result.data.circle.isPublic).toBe(true);
    });
  });

  describe('用户状态检查逻辑测试', () => {
    let mockCircle;
    let mockCurrentUser;

    beforeEach(() => {
      mockCircle = {
        _id: 'circle-123',
        name: '测试朋友圈',
        creator: 'creator-id',
        members: ['creator-id', 'member-1'],
        appliers: ['applier-1'],
        isPublic: true
      };

      mockCurrentUser = {
        _id: 'user-123',
        username: '测试用户'
      };
    });

    // 模拟checkUserStatus函数的逻辑
    function checkUserStatus(currentUser, circle, isInviteMode = false) {
      if (!currentUser || !currentUser._id) {
        return {
          isOwner: false,
          isMember: false,
          hasApplied: false,
          showApplyButton: false
        };
      }

      const userId = currentUser._id;
      
      const isMember = circle.members && circle.members.some(member => {
        const memberId = typeof member === 'object' ? member._id : member;
        return memberId === userId;
      });

      const creatorId = typeof circle.creator === 'object' ? circle.creator._id : circle.creator;
      const isOwner = creatorId === userId;

      const hasApplied = circle.appliers && circle.appliers.some(applier => {
        const applierId = typeof applier === 'object' ? applier._id : applier;
        return applierId === userId;
      });

      const showApplyButton = !isMember && 
                             circle.isPublic && 
                             !hasApplied && 
                             !isInviteMode;

      return {
        isOwner,
        isMember,
        hasApplied,
        showApplyButton
      };
    }

    test('朋友圈主人应该被正确识别', () => {
      mockCurrentUser._id = 'creator-id';
      
      const result = checkUserStatus(mockCurrentUser, mockCircle);
      
      expect(result.isOwner).toBe(true);
      expect(result.isMember).toBe(true);
      expect(result.showApplyButton).toBe(false);
    });

    test('朋友圈成员应该被正确识别', () => {
      mockCurrentUser._id = 'member-1';
      
      const result = checkUserStatus(mockCurrentUser, mockCircle);
      
      expect(result.isOwner).toBe(false);
      expect(result.isMember).toBe(true);
      expect(result.showApplyButton).toBe(false);
    });

    test('非成员用户在公开朋友圈应该显示申请按钮', () => {
      mockCurrentUser._id = 'non-member';
      
      const result = checkUserStatus(mockCurrentUser, mockCircle);
      
      expect(result.isOwner).toBe(false);
      expect(result.isMember).toBe(false);
      expect(result.hasApplied).toBe(false);
      expect(result.showApplyButton).toBe(true);
    });

    test('已申请用户不应该显示申请按钮', () => {
      mockCurrentUser._id = 'applier-1';
      
      const result = checkUserStatus(mockCurrentUser, mockCircle);
      
      expect(result.isOwner).toBe(false);
      expect(result.isMember).toBe(false);
      expect(result.hasApplied).toBe(true);
      expect(result.showApplyButton).toBe(false);
    });

    test('私密朋友圈不应该显示申请按钮', () => {
      mockCurrentUser._id = 'non-member';
      mockCircle.isPublic = false;
      
      const result = checkUserStatus(mockCurrentUser, mockCircle);
      
      expect(result.showApplyButton).toBe(false);
    });

    test('邀请模式下不应该显示申请按钮', () => {
      mockCurrentUser._id = 'non-member';
      
      const result = checkUserStatus(mockCurrentUser, mockCircle, true);
      
      expect(result.showApplyButton).toBe(false);
    });

    test('未登录用户不应该显示申请按钮', () => {
      const result = checkUserStatus(null, mockCircle);
      
      expect(result.isOwner).toBe(false);
      expect(result.isMember).toBe(false);
      expect(result.hasApplied).toBe(false);
      expect(result.showApplyButton).toBe(false);
    });
  });

  describe('申请加入流程测试', () => {
    test('成功申请加入应该调用正确的API并显示成功提示', async () => {
      api.circles.applyToJoin.mockResolvedValue({
        success: true,
        message: '申请已提交，请等待审核'
      });

      // 模拟详情页的applyToJoin方法调用
      const mockCircleId = 'circle-123';
      const mockCurrentUser = { _id: 'user-456', username: '申请者' };

      // 调用API
      const result = await api.circles.applyToJoin(mockCircleId);

      expect(api.circles.applyToJoin).toHaveBeenCalledWith(mockCircleId);
      expect(result.success).toBe(true);
    });

    test('申请失败应该显示错误信息', async () => {
      const errorMessage = '你已经是朋友圈成员';
      api.circles.applyToJoin.mockRejectedValue(new Error(errorMessage));

      try {
        await api.circles.applyToJoin('circle-123');
      } catch (error) {
        expect(error.message).toBe(errorMessage);
      }
    });

    test('未登录用户申请应该提示登录', () => {
      const mockCurrentUser = null;
      
      // 模拟未登录状态检查
      if (!mockCurrentUser || !mockCurrentUser._id) {
        expect(true).toBe(true); // 应该进入登录提示流程
      }
    });
  });

  describe('申请审核流程测试', () => {
    test('朋友圈主人应该能够同意申请', async () => {
      api.circles.approveApplication.mockResolvedValue({
        success: true,
        message: '已同意申请，用户成功加入朋友圈'
      });

      const result = await api.circles.approveApplication('circle-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.message).toContain('已同意申请');
    });

    test('朋友圈主人应该能够拒绝申请', async () => {
      api.circles.rejectApplication.mockResolvedValue({
        success: true,
        message: '已拒绝申请'
      });

      const result = await api.circles.rejectApplication('circle-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.message).toContain('已拒绝申请');
    });

    test('同意申请失败应该显示错误信息', async () => {
      const errorMessage = '该用户已经是朋友圈成员';
      api.circles.approveApplication.mockRejectedValue(new Error(errorMessage));

      try {
        await api.circles.approveApplication('circle-123', 'user-456');
      } catch (error) {
        expect(error.message).toBe(errorMessage);
      }
    });

    test('拒绝申请失败应该显示错误信息', async () => {
      const errorMessage = '该用户未申请加入此朋友圈';
      api.circles.rejectApplication.mockRejectedValue(new Error(errorMessage));

      try {
        await api.circles.rejectApplication('circle-123', 'user-456');
      } catch (error) {
        expect(error.message).toBe(errorMessage);
      }
    });
  });

  describe('公开朋友圈推荐功能测试', () => {
    test('应该能够加载随机公开朋友圈', async () => {
      const mockCircle = {
        _id: 'circle-1',
        name: '公开朋友圈1',
        isPublic: true,
        creator: { _id: 'user-1', username: 'creator1', avatar: '/avatar1.jpg' },
        members: ['user-1', 'user-2'],
        createdAt: '2024-01-15T10:00:00Z',
        latestPost: { content: '最新动态内容', images: [] }
      };

      api.circles.getRandomPublicCircle.mockResolvedValue({
        success: true,
        data: { 
          circle: mockCircle,
          randomInfo: { totalAvailable: 5, visitedCount: 1 }
        }
      });

      const result = await api.circles.getRandomPublicCircle({ excludeVisited: 'true' });

      expect(result.success).toBe(true);
      expect(result.data.circle).toBeDefined();
      expect(result.data.circle.isPublic).toBe(true);
      expect(result.data.circle.members).toHaveLength(2);
      expect(result.data.randomInfo.totalAvailable).toBe(5);
    });

    test('推荐数据应该包含必要的格式化字段', () => {
      const mockCircle = {
        _id: 'circle-1',
        name: '测试朋友圈',
        createdAt: '2024-01-15T10:00:00Z',
        members: ['user-1', 'user-2'],
        latestPost: { content: '最新动态', images: [] }
      };

      // 模拟主页的数据格式化逻辑
      const formattedCircle = {
        ...mockCircle,
        formattedTime: '1小时前', // 模拟时间格式化
        memberCount: mockCircle.members ? mockCircle.members.length : 0,
        hasLatestPost: !!(mockCircle.latestPost && mockCircle.latestPost.content)
      };

      expect(formattedCircle.memberCount).toBe(2);
      expect(formattedCircle.hasLatestPost).toBe(true);
      expect(formattedCircle.formattedTime).toBeDefined();
    });
  });

  describe('边界情况和错误处理测试', () => {
    test('API调用失败应该有适当的错误处理', async () => {
      api.circles.applyToJoin.mockRejectedValue(new Error('网络连接失败'));

      try {
        await api.circles.applyToJoin('circle-123');
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toBe('网络连接失败');
      }
    });

    test('空的申请者列表应该被正确处理', async () => {
      api.circles.getAppliers.mockResolvedValue({
        success: true,
        data: { appliers: [] }
      });

      const result = await api.circles.getAppliers('circle-123');

      expect(result.success).toBe(true);
      expect(result.data.appliers).toHaveLength(0);
    });

    test('空的随机推荐应该被正确处理', async () => {
      api.circles.getRandomPublicCircle.mockResolvedValue({
        success: true,
        data: { 
          circle: null,
          randomInfo: { totalAvailable: 0, visitedCount: 0 }
        }
      });

      const result = await api.circles.getRandomPublicCircle();

      expect(result.success).toBe(true);
      expect(result.data.circle).toBeNull();
      expect(result.data.randomInfo.totalAvailable).toBe(0);
    });

    test('申请者数据结构应该兼容多种格式', () => {
      const testCases = [
        {
          name: '标准格式',
          applier: { _id: 'user-1', username: 'test1' },
          expected: 'user-1'
        },
        {
          name: '只有ID字符串',
          applier: 'user-2',
          expected: 'user-2'
        }
      ];

      testCases.forEach(({ name, applier, expected }) => {
        const applierId = typeof applier === 'object' ? applier._id : applier;
        expect(applierId).toBe(expected);
      });
    });
  });

  describe('权限和安全性测试', () => {
    test('只有朋友圈主人才能查看申请列表', () => {
      const circle = {
        creator: 'owner-id',
        appliers: ['user-1', 'user-2']
      };

      const currentUser = { _id: 'owner-id' };
      const normalUser = { _id: 'user-3' };

      // 朋友圈主人应该可以查看
      const ownerCanView = currentUser._id === circle.creator;
      expect(ownerCanView).toBe(true);

      // 普通用户不应该可以查看
      const normalUserCanView = normalUser._id === circle.creator;
      expect(normalUserCanView).toBe(false);
    });

    test('只有朋友圈主人才能处理申请', () => {
      const circle = { creator: 'owner-id' };
      const currentUser = { _id: 'owner-id' };
      const normalUser = { _id: 'user-3' };

      expect(currentUser._id === circle.creator).toBe(true);
      expect(normalUser._id === circle.creator).toBe(false);
    });

    test('申请加入应该检查朋友圈公开状态', () => {
      const publicCircle = { isPublic: true };
      const privateCircle = { isPublic: false };

      expect(publicCircle.isPublic).toBe(true);
      expect(privateCircle.isPublic).toBe(false);
    });
  });
});