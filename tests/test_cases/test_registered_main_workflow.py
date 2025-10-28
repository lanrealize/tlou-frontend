#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 check_actions_registered_main helper 是否有效

测试场景：验证注册用户在 main 页面的完整流程和功能
"""

import sys
import os

# 添加项目根目录到 Python 路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from tests.helpers.system_helper import launch_miniprogram, close_miniprogram
from tests.helpers.workflow_helper import check_actions_registered_main


def test_registered_main_workflow():
    """
    测试注册用户在 main 页面的工作流
    
    测试步骤：
    1. 启动小程序（不进入测试模式，使用真实用户环境）
    2. 调用 check_actions_registered_main helper
    3. 验证所有功能是否正常
    """
    mini = None
    
    try:
        print('\n' + '='*60)
        print('🧪 测试 check_actions_registered_main helper')
        print('='*60)
        
        # 步骤1：启动小程序（不进入测试模式）
        print('\n【步骤1】启动小程序（真实用户模式）')
        mini = launch_miniprogram()
        
        # 步骤2：调用 check_actions_registered_main helper
        # 模式：进入最近朋友圈
        print('\n【步骤2】执行 check_actions_registered_main 工作流')
        print('   模式: 进入最近朋友圈')
        result = check_actions_registered_main(mini, check_recent_circle='enter')
        
        # 验证结果
        print('\n' + '='*60)
        print('📊 测试结果')
        print('='*60)
        
        if result['success']:
            print('✅ 所有功能验证通过')
            print(f'   消息: {result["message"]}')
            print(f'   失败检查数: {len(result.get("failed_checks", []))}')
            print('\n🎉 测试通过！check_actions_registered_main helper 工作正常！')
            return True
        else:
            print('❌ 功能验证失败')
            print(f'   错误信息: {result["message"]}')
            
            # 打印所有失败的检查项
            failed_checks = result.get('failed_checks', [])
            if failed_checks:
                print(f'\n   失败的检查项 ({len(failed_checks)})：')
                for i, check in enumerate(failed_checks, 1):
                    print(f'   [{i}] {check}')
            
            print('\n❌ 测试失败：部分功能验证失败')
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
    success = test_registered_main_workflow()
    sys.exit(0 if success else 1)

