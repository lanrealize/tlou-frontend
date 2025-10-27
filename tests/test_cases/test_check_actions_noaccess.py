#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 check_actions_noaccess_main workflow helper

基于 test_check_toast.py，使用 workflow_helper 验证所有无权限操作的 Toast 提示
测试场景：未加入朋友圈的用户尝试各种操作，应该都显示 "请先申请加入" toast
"""

import sys
import os

# 添加项目根目录到 Python 路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

import time
from tests.helpers.system_helper import launch_miniprogram, close_miniprogram
from tests.helpers.workflow_helper import check_actions_noaccess_main


def test_noaccess_actions_with_workflow_helper():
    """
    测试无权限用户的所有操作（使用 workflow helper）
    
    测试步骤：
    1. 启动小程序（不进入测试模式，保持未登录/未加入状态）
    2. 使用 check_actions_noaccess_main 验证所有无权限操作
       - 点赞
       - 评论
       - 回复
       - 进入设置
    3. 验证所有操作都显示正确的 Toast 提示
    """
    mini = None
    
    try:
        print('\n' + '='*60)
        print('🧪 测试 check_actions_noaccess_main workflow helper')
        print('='*60)
        
        # 步骤1：启动小程序（不进入测试模式）
        print('\n【步骤1】启动小程序（非测试模式）')
        mini = launch_miniprogram()
        
        # 步骤2：使用 workflow helper 验证所有无权限操作
        print('\n【步骤2】使用 workflow helper 验证所有无权限操作')
        circle_id = '68ff891795ba239deab452ea'
        expected_toast = '请先申请加入'
        
        result = check_actions_noaccess_main(
            mini,
            circle_id=circle_id,
            toast_text=expected_toast
        )
        
        # 步骤3：验证结果
        print('\n' + '='*60)
        print('📊 测试结果')
        print('='*60)
        
        if result['success']:
            print('✅ 测试通过！所有无权限操作的 Toast 提示都正确')
            print(f'   验证的操作：点赞、评论、回复、进入设置')
            print(f'   预期 Toast: "{expected_toast}"')
            print('\n🎉 check_actions_noaccess_main helper 工作正常！')
            return True
        else:
            print(f'❌ 测试失败：{result["message"]}')
            
            if result.get('failed_checks'):
                print(f'\n失败的检查项（{len(result["failed_checks"])} 项）：')
                for i, check in enumerate(result['failed_checks'], 1):
                    print(f'   {i}. {check}')
            
            print('\n❌ check_actions_noaccess_main helper 存在问题')
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
    success = test_noaccess_actions_with_workflow_helper()
    sys.exit(0 if success else 1)

