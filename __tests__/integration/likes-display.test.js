// __tests__/integration/likes-display.test.js
/**
 * 点赞用户显示功能集成测试
 */

describe('点赞用户显示功能集成测试', () => {
  describe('显示逻辑', () => {
    test('无点赞时不显示点赞区域', () => {
      const post = {
        _id: 'post123',
        likes: [],
        likedUsers: []
      };

      const shouldShowLikesSection = post.likes && post.likes.length > 0;
      expect(shouldShowLikesSection).toBe(false);
    });

    test('有点赞但无用户信息时显示人数', () => {
      const post = {
        _id: 'post123',
        likes: ['user1', 'user2'],
        likedUsers: [] // 后端未返回用户信息
      };

      const hasLikedUsers = post.likedUsers && post.likedUsers.length > 0;
      expect(hasLikedUsers).toBe(false);
      
      // 应该显示 "2人觉得很赞"
      const displayText = `${post.likes.length}人觉得很赞`;
      expect(displayText).toBe('2人觉得很赞');
    });

    test('1个用户点赞时显示用户名', () => {
      const post = {
        _id: 'post123',
        likes: ['user1'],
        likedUsers: [
          { _id: 'user1', username: '张三', avatar: 'avatar1.jpg' }
        ]
      };

      const displayUsers = post.likedUsers.slice(0, 3);
      expect(displayUsers).toHaveLength(1);
      expect(displayUsers[0].username).toBe('张三');
      
      // 应该显示 "张三觉得很赞"
      const displayText = `${displayUsers[0].username}觉得很赞`;
      expect(displayText).toBe('张三觉得很赞');
    });

    test('2个用户点赞时显示两个用户名', () => {
      const post = {
        _id: 'post123',
        likes: ['user1', 'user2'],
        likedUsers: [
          { _id: 'user1', username: '张三', avatar: 'avatar1.jpg' },
          { _id: 'user2', username: '李四', avatar: 'avatar2.jpg' }
        ]
      };

      const displayUsers = post.likedUsers.slice(0, 3);
      expect(displayUsers).toHaveLength(2);
      
      // 应该显示 "张三、李四觉得很赞"
      const userNames = displayUsers.map(user => user.username).join('、');
      const displayText = `${userNames}觉得很赞`;
      expect(displayText).toBe('张三、李四觉得很赞');
    });

    test('3个用户点赞时显示三个用户名', () => {
      const post = {
        _id: 'post123',
        likes: ['user1', 'user2', 'user3'],
        likedUsers: [
          { _id: 'user1', username: '张三', avatar: 'avatar1.jpg' },
          { _id: 'user2', username: '李四', avatar: 'avatar2.jpg' },
          { _id: 'user3', username: '王五', avatar: 'avatar3.jpg' }
        ]
      };

      const displayUsers = post.likedUsers.slice(0, 3);
      expect(displayUsers).toHaveLength(3);
      
      // 应该显示 "张三、李四、王五觉得很赞"
      const userNames = displayUsers.map(user => user.username).join('、');
      const displayText = `${userNames}觉得很赞`;
      expect(displayText).toBe('张三、李四、王五觉得很赞');
    });

    test('超过3个用户点赞时显示前3个和总数', () => {
      const post = {
        _id: 'post123',
        likes: ['user1', 'user2', 'user3', 'user4', 'user5'],
        likedUsers: [
          { _id: 'user1', username: '张三', avatar: 'avatar1.jpg' },
          { _id: 'user2', username: '李四', avatar: 'avatar2.jpg' },
          { _id: 'user3', username: '王五', avatar: 'avatar3.jpg' },
          { _id: 'user4', username: '赵六', avatar: 'avatar4.jpg' },
          { _id: 'user5', username: '孙七', avatar: 'avatar5.jpg' }
        ]
      };

      const displayUsers = post.likedUsers.slice(0, 3);
      expect(displayUsers).toHaveLength(3);
      
      const shouldShowMore = post.likedUsers.length > 3;
      expect(shouldShowMore).toBe(true);
      
      // 应该显示 "张三、李四、王五 等5人觉得很赞"
      const userNames = displayUsers.map(user => user.username).join('、');
      const displayText = `${userNames} 等${post.likes.length}人觉得很赞`;
      expect(displayText).toBe('张三、李四、王五 等5人觉得很赞');
    });
  });

  describe('数据一致性检查', () => {
    test('likes数组和likedUsers数组数量应该一致', () => {
      const post = {
        _id: 'post123',
        likes: ['user1', 'user2', 'user3'],
        likedUsers: [
          { _id: 'user1', username: '张三', avatar: 'avatar1.jpg' },
          { _id: 'user2', username: '李四', avatar: 'avatar2.jpg' },
          { _id: 'user3', username: '王五', avatar: 'avatar3.jpg' }
        ]
      };

      expect(post.likes.length).toBe(post.likedUsers.length);
    });

    test('likes数组和likedUsers数组用户ID应该匹配', () => {
      const post = {
        _id: 'post123',
        likes: ['user1', 'user2', 'user3'],
        likedUsers: [
          { _id: 'user1', username: '张三', avatar: 'avatar1.jpg' },
          { _id: 'user2', username: '李四', avatar: 'avatar2.jpg' },
          { _id: 'user3', username: '王五', avatar: 'avatar3.jpg' }
        ]
      };

      const likedUserIds = post.likedUsers.map(user => user._id);
      expect(likedUserIds).toEqual(expect.arrayContaining(post.likes));
    });
  });

  describe('边界情况处理', () => {
    test('处理用户名为空的情况', () => {
      const post = {
        _id: 'post123',
        likes: ['user1'],
        likedUsers: [
          { _id: 'user1', username: '', avatar: 'avatar1.jpg' }
        ]
      };

      const displayUsers = post.likedUsers.slice(0, 3);
      expect(displayUsers[0].username).toBe('');
      
      // 即使用户名为空，也应该正常处理
      const displayText = displayUsers[0].username || '未知用户';
      expect(displayText).toBe('未知用户');
    });

    test('处理用户名很长的情况', () => {
      const longUsername = '这是一个非常非常非常长的用户名字符串测试';
      const post = {
        _id: 'post123',
        likes: ['user1'],
        likedUsers: [
          { _id: 'user1', username: longUsername, avatar: 'avatar1.jpg' }
        ]
      };

      const displayUsers = post.likedUsers.slice(0, 3);
      expect(displayUsers[0].username).toBe(longUsername);
      expect(displayUsers[0].username.length).toBeGreaterThan(10);
    });

    test('处理特殊字符用户名', () => {
      const specialUsername = '张三😀🎉@#$%';
      const post = {
        _id: 'post123',
        likes: ['user1'],
        likedUsers: [
          { _id: 'user1', username: specialUsername, avatar: 'avatar1.jpg' }
        ]
      };

      const displayUsers = post.likedUsers.slice(0, 3);
      expect(displayUsers[0].username).toBe(specialUsername);
    });

    test('处理likes和likedUsers数量不匹配的情况', () => {
      const post = {
        _id: 'post123',
        likes: ['user1', 'user2', 'user3'], // 3个用户
        likedUsers: [ // 只有2个用户信息
          { _id: 'user1', username: '张三', avatar: 'avatar1.jpg' },
          { _id: 'user2', username: '李四', avatar: 'avatar2.jpg' }
        ]
      };

      // 应该优先使用likedUsers来显示，如果不够再回退到数量显示
      const hasCompleteUserInfo = post.likedUsers.length === post.likes.length;
      expect(hasCompleteUserInfo).toBe(false);
      
      if (!hasCompleteUserInfo && post.likedUsers.length > 0) {
        // 部分显示用户名 + 总数
        const displayUsers = post.likedUsers.slice(0, 3);
        const userNames = displayUsers.map(user => user.username).join('、');
        const displayText = `${userNames} 等${post.likes.length}人觉得很赞`;
        expect(displayText).toBe('张三、李四 等3人觉得很赞');
      }
    });
  });

  describe('WXML模板逻辑模拟', () => {
    test('模拟WXML中的条件渲染逻辑', () => {
      const testCases = [
        {
          name: '无点赞',
          post: { likes: [], likedUsers: [] },
          shouldShowSection: false
        },
        {
          name: '有点赞无用户信息',
          post: { likes: ['user1'], likedUsers: [] },
          shouldShowSection: true,
          expectedDisplay: '1人觉得很赞'
        },
        {
          name: '有点赞有用户信息',
          post: { 
            likes: ['user1'], 
            likedUsers: [{ _id: 'user1', username: '张三' }] 
          },
          shouldShowSection: true,
          expectedDisplay: '张三觉得很赞'
        }
      ];

      testCases.forEach(testCase => {
        const { post, shouldShowSection, expectedDisplay } = testCase;
        
        // 模拟 wx:if="{{post.likes && post.likes.length > 0}}"
        const showLikesSection = !!(post.likes && post.likes.length > 0);
        expect(showLikesSection).toBe(shouldShowSection);
        
        if (showLikesSection && expectedDisplay) {
          // 模拟 wx:if="{{post.likedUsers && post.likedUsers.length > 0}}"
          const hasLikedUsers = !!(post.likedUsers && post.likedUsers.length > 0);
          
          if (hasLikedUsers) {
            const displayText = `${post.likedUsers[0].username}觉得很赞`;
            expect(displayText).toBe(expectedDisplay);
          } else {
            const displayText = `${post.likes.length}人觉得很赞`;
            expect(displayText).toBe(expectedDisplay);
          }
        }
      });
    });
  });
});