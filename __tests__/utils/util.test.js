// __tests__/utils/util.test.js
/**
 * 工具函数测试
 */

const util = require('../../utils/util');

describe('util 工具函数', () => {
  describe('时间格式化函数', () => {
    describe('formatTime', () => {
      test('应该正确格式化时间', () => {
        const date = new Date('2024-01-15 10:30:45');
        const result = util.formatTime(date);
        expect(result).toBe('2024-01-15 10:30:45');
      });

      test('应该支持自定义格式', () => {
        const date = new Date('2024-01-15 10:30:45');
        const result = util.formatTime(date, 'YYYY/MM/DD');
        expect(result).toBe('2024/01/15');
      });

      test('应该处理无效日期', () => {
        expect(util.formatTime(null)).toBe('');
        expect(util.formatTime(undefined)).toBe('');
        expect(util.formatTime('invalid')).toBe('');
      });
    });

    describe('formatRelativeTime', () => {
      beforeAll(() => {
        // 固定当前时间用于测试
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-15 12:00:00'));
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      test('应该显示"刚刚"对于很近的时间', () => {
        const recentTime = new Date('2024-01-15 11:59:30');
        expect(util.formatRelativeTime(recentTime)).toBe('刚刚');
      });

      test('应该显示分钟数', () => {
        const time = new Date('2024-01-15 11:55:00');
        expect(util.formatRelativeTime(time)).toBe('5分钟前');
      });

      test('应该显示小时数', () => {
        const time = new Date('2024-01-15 10:00:00');
        expect(util.formatRelativeTime(time)).toBe('2小时前');
      });

      test('应该显示天数', () => {
        const time = new Date('2024-01-13 12:00:00');
        expect(util.formatRelativeTime(time)).toBe('2天前');
      });

      test('应该处理未来时间', () => {
        const futureTime = new Date('2024-01-15 13:00:00');
        expect(util.formatRelativeTime(futureTime)).toBe('刚刚');
      });
    });
  });

  describe('字符串处理函数', () => {
    describe('isEmpty', () => {
      test('应该正确判断空字符串', () => {
        expect(util.isEmpty('')).toBe(true);
        expect(util.isEmpty('   ')).toBe(true);
        expect(util.isEmpty(null)).toBe(true);
        expect(util.isEmpty(undefined)).toBe(true);
      });

      test('应该正确判断非空字符串', () => {
        expect(util.isEmpty('hello')).toBe(false);
        expect(util.isEmpty('  hello  ')).toBe(false);
        expect(util.isEmpty('0')).toBe(false);
      });
    });

    describe('truncate', () => {
      test('应该正确截取字符串', () => {
        const longText = '这是一个很长的文本内容';
        expect(util.truncate(longText, 5)).toBe('这是一个很...');
      });

      test('应该支持自定义后缀', () => {
        const longText = '这是一个很长的文本内容';
        expect(util.truncate(longText, 5, '---')).toBe('这是一个很---');
      });

      test('应该处理短文本', () => {
        const shortText = '短文本';
        expect(util.truncate(shortText, 10)).toBe('短文本');
      });
    });
  });

  describe('函数工具', () => {
    describe('debounce', () => {
      test('应该正确防抖', (done) => {
        const mockFn = jest.fn();
        const debouncedFn = util.debounce(mockFn, 100);

        debouncedFn();
        debouncedFn();
        debouncedFn();

        expect(mockFn).not.toHaveBeenCalled();

        setTimeout(() => {
          expect(mockFn).toHaveBeenCalledTimes(1);
          done();
        }, 150);
      });
    });

    describe('throttle', () => {
      test('应该正确节流', (done) => {
        const mockFn = jest.fn();
        const throttledFn = util.throttle(mockFn, 100);

        throttledFn();
        throttledFn();
        throttledFn();

        expect(mockFn).toHaveBeenCalledTimes(1);

        setTimeout(() => {
          throttledFn();
          expect(mockFn).toHaveBeenCalledTimes(2);
          done();
        }, 150);
      });
    });
  });

  describe('微信API封装函数', () => {
    describe('showToast', () => {
      test('应该调用wx.showToast', () => {
        util.showToast('测试消息');
        
        expect(wx.showToast).toHaveBeenCalledWith({
          title: '测试消息',
          icon: 'none',
          duration: 2000
        });
      });

      test('应该支持自定义参数', () => {
        util.showToast('成功', 'success', 1000);
        
        expect(wx.showToast).toHaveBeenCalledWith({
          title: '成功',
          icon: 'success',
          duration: 1000
        });
      });
    });

    describe('showConfirm', () => {
      test('应该返回Promise并处理确认结果', async () => {
        wx.showModal.mockImplementation(({ success }) => {
          success({ confirm: true });
        });

        const result = await util.showConfirm('确认删除吗？');
        
        expect(result).toBe(true);
        expect(wx.showModal).toHaveBeenCalledWith({
          title: '提示',
          content: '确认删除吗？',
          success: expect.any(Function)
        });
      });
    });

    describe('setClipboardData', () => {
      test('应该复制数据到剪贴板', async () => {
        wx.setClipboardData.mockImplementation(({ success }) => {
          success();
        });

        await util.setClipboardData('测试文本');
        
        expect(wx.setClipboardData).toHaveBeenCalledWith({
          data: '测试文本',
          success: expect.any(Function),
          fail: expect.any(Function)
        });
      });
    });
  });

  describe('业务相关函数', () => {
    describe('generateDefaultCircleName', () => {
      test('应该生成正确的朋友圈名称', () => {
        const mockDate = new Date('2024-07-15'); // 夏天
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        const name = util.generateDefaultCircleName();
        expect(name).toBe('2024年 夏天');

        global.Date.mockRestore();
      });

      test('应该根据月份判断季节', () => {
        // 测试春季
        const springDate = new Date('2024-04-15');
        jest.spyOn(global, 'Date').mockImplementation(() => springDate);
        expect(util.generateDefaultCircleName()).toBe('2024年 春天');

        // 测试冬季
        const winterDate = new Date('2024-12-15');
        jest.spyOn(global, 'Date').mockImplementation(() => winterDate);
        expect(util.generateDefaultCircleName()).toBe('2024年 冬天');

        global.Date.mockRestore();
      });
    });

    describe('generateId', () => {
      test('应该生成指定长度的ID', () => {
        const id = util.generateId(8);
        expect(id).toHaveLength(8);
        expect(typeof id).toBe('string');
      });

      test('应该生成不同的ID', () => {
        const id1 = util.generateId();
        const id2 = util.generateId();
        expect(id1).not.toBe(id2);
      });
    });
  });
});