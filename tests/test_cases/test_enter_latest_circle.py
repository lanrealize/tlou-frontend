#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 enter_latest_circle helper 是否有效

测试场景：真实用户点击最近朋友圈卡片进入 details 页面
"""

import sys
import os

# 添加项目根目录到 Python 路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from tests.helpers.system_helper import launch_miniprogram, close_miniprogram
from tests.helpers.circle_helper import enter_latest_circle


def test_enter_latest_circle_helper():
    """
    测试 enter_latest_circle helper
    
    测试步骤：
    1. 启动小程序（不进入测试模式，使用真实用户）
    2. 调用 enter_latest_circle(mini)
    3. 验证结果
    """
    mini = None
    
    try:
        print('\n' + '='*60)
        print('🧪 测试 enter_latest_circle helper')
        print('='*60)
        
        # 步骤1：启动小程序（不进入测试模式）
        print('\n【步骤1】启动小程序（真实用户模式）')
        mini = launch_miniprogram()
        print('   ✅ 小程序启动成功')
        
        # 步骤2：调用 enter_latest_circle helper
        print('\n【步骤2】调用 enter_latest_circle helper')
        result = enter_latest_circle(mini)
        
        # 步骤3：验证结果
        print('\n' + '='*60)
        print('📊 测试结果')
        print('='*60)
        
        if result['success']:
            print('✅ 成功进入最近朋友圈')
            print(f'   朋友圈 ID: {result["circle_id"][:8]}...')
            print(f'   完整 ID: {result["circle_id"]}')
            print(f'   消息: {result["message"]}')
            print('\n🎉 测试通过！enter_latest_circle helper 工作正常！')
            return True
        else:
            print('❌ 进入最近朋友圈失败')
            print(f'   错误信息: {result["message"]}')
            print(f'   朋友圈 ID: {result.get("circle_id", "N/A")}')
            print('\n❌ 测试失败：helper 执行失败')
            return False
        
    except Exception as e:
        print(f'\n❌ 测试过程中出现异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # 清理：关闭小程序
        if mini:
            print('\n' + '='*60)
            close_miniprogram(mini)


if __name__ == '__main__':
    success = test_enter_latest_circle_helper()
    sys.exit(0 if success else 1)

