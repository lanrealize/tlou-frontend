#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试未注册用户的完整 E2E 流程

测试场景：验证未注册用户到注册用户的完整用户流程
1. 未注册用户在 main 页面的操作验证（含进入发现朋友圈并验证状态）
2. 未注册用户在 details 页面的操作验证
3. 点击创建朋友圈触发登录
4. 完成用户注册
5. 等待自动创建朋友圈并验证成员状态
6. 作为成员在 details 页面的完整操作
7. 作为注册用户在 main 页面的操作验证
"""

import sys
import io
import os

# 添加项目根目录到 Python 路径
# 文件路径: tests/tests/productions/test_unregistered_e2e.py
# 需要向上3层到达 tests/ 目录
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
tests_root = os.path.join(project_root, 'tests')
sys.path.insert(0, tests_root)

from helpers.system_helper import launch_miniprogram, close_miniprogram, enter_test_mode, exit_test_mode
from helpers.workflow_helper import (
    check_actions_unregistered_main,
    check_actions_unregistered_details,
    check_actions_member_details,
    check_actions_registered_main
)
from helpers.auth_helper import complete_user_login
from helpers.navigation_helper import navigate_to_main
from helpers.element_helper import click_create_circle_button
from helpers.circle_helper import wait_and_get_created_circle_id
from helpers.circle_helper import check_circle_status_action
import time


# 测试配置
TEST_CONFIG = {
    'test_nickname': '测试用户',
    'test_avatar': 'https://tlou.images.wltech-service.site/testResources/testAvatar.jpg',
    'test_images': [
        os.path.join(project_root, 'tests', 'resources', 'test.jpg'),
        os.path.join(project_root, 'tests', 'resources', 'test1.jpg'),
        os.path.join(project_root, 'tests', 'resources', 'test2.jpg')
    ],
    'test_circle_id': '69097e93b88209834a86462b'  # 用于 DETAILS_006 回复评论测试（需要有评论）
}


def test_unregistered_e2e():
    """
    测试未注册用户的完整 E2E 流程
    
    测试步骤：
    1. 启动小程序并进入测试模式
    2. 验证未注册用户在 main 页面的操作（含进入发现朋友圈并验证状态）
    3. 验证未注册用户在 details 页面的操作
    4. 返回 main 页面
    5. 点击创建朋友圈按钮（触发登录）
    6. 完成用户登录
    7. 等待朋友圈创建完成并验证成员状态
    8. 作为成员在 details 页面进行完整操作
    9. 返回 main 页面
    10. 作为注册用户在 main 页面进行操作
    """
    mini = None
    
    try:
        print('\n' + '='*60)
        print('开始测试：未注册用户 E2E 流程')
        print('='*60)
        
        # 步骤1：启动小程序并进入测试模式
        print('\n【步骤1】启动小程序并进入测试模式')
        print('-'*60)
        mini = launch_miniprogram()
        time.sleep(1)
        enter_test_mode(mini)
        time.sleep(1)
        print('✅ 步骤1完成')
        
        # 步骤2：验证未注册用户在 main 页面的操作（包含进入发现朋友圈并验证状态）
        print('\n【步骤2】验证未注册用户在 main 页面的操作')
        print('-'*60)
        result = check_actions_unregistered_main(mini)
        if not result['success']:
            print(f'❌ 步骤2失败：{result["message"]}')
            return False
        discover_circle_id = result.get('circle_id')
        print('✅ 步骤2完成')
        
        # 步骤3：验证未注册用户在 details 页面的操作
        print('\n【步骤3】验证未注册用户在 details 页面的操作')
        print('-'*60)
        result = check_actions_unregistered_details(mini, TEST_CONFIG['test_circle_id'])
        if not result['success']:
            print(f'❌ 步骤3失败：{result["message"]}')
            return False
        print('✅ 步骤3完成')
        
        # 步骤4：返回 main 页面
        print('\n【步骤4】返回 main 页面')
        print('-'*60)
        result = navigate_to_main(mini, use_relaunch=True)
        if not result['success']:
            print(f'❌ 步骤4失败：{result["message"]}')
            return False
        print('✅ 步骤4完成')
        
        time.sleep(0.5)
        
        # 步骤5：点击创建朋友圈按钮（触发登录弹窗）
        print('\n【步骤5】点击创建朋友圈按钮')
        print('-'*60)
        click_result = click_create_circle_button(mini)
        if not click_result['success']:
            print(f'❌ 步骤5失败：{click_result["message"]}')
            return False
        print('✅ 步骤5完成')
        
        time.sleep(0.3)
        
        # 步骤6：完成用户登录
        print('\n【步骤6】完成用户登录')
        print('-'*60)
        login_result = complete_user_login(
            mini,
            nickname=TEST_CONFIG['test_nickname'],
            avatar_url=TEST_CONFIG['test_avatar']
        )
        
        if not login_result['success']:
            print(f'❌ 步骤6失败：{login_result["message"]}')
            return False
        
        print(f'✅ 步骤6完成：用户登录成功（{login_result["user_info"]["username"]}）')
        
        # 步骤7：等待朋友圈创建完成并验证成员状态
        print('\n【步骤7】等待朋友圈创建完成并验证成员状态')
        print('-'*60)
        
        # 等待朋友圈创建完成并获取ID
        result = wait_and_get_created_circle_id(mini, wait_seconds=3.0)
        if not result['success']:
            print(f'❌ 步骤7失败：{result["message"]}')
            return False
        
        circle_id = result['circle_id']
        print(f'   ✅ 朋友圈创建成功，ID: {circle_id[:12]}...')
        
        # 验证成员状态
        status_result = check_circle_status_action(mini, expected_user_status='member')
        if not status_result['match']:
            print(f'❌ 步骤7失败：状态验证失败')
            for error in status_result.get('errors', []):
                print(f'   {error}')
            return False
        print('✅ 步骤7完成')
        
        # 步骤8：作为成员在 details 页面进行完整操作
        print('\n【步骤8】作为成员在 details 页面进行完整操作')
        print('-'*60)
        result = check_actions_member_details(mini, circle_id, TEST_CONFIG['test_images'])
        if not result['success']:
            print(f'❌ 步骤8失败：{result["message"]}')
            return False
        print('✅ 步骤8完成')
        
        # 步骤9：返回 main 页面
        print('\n【步骤9】返回 main 页面')
        print('-'*60)
        result = navigate_to_main(mini, use_relaunch=True)
        if not result['success']:
            print(f'❌ 步骤9失败：{result["message"]}')
            return False
        print('✅ 步骤9完成')
        
        time.sleep(0.5)
        
        # 步骤10：作为注册用户在 main 页面进行操作
        print('\n【步骤10】作为注册用户在 main 页面进行操作')
        print('-'*60)
        result = check_actions_registered_main(mini, check_recent_circle='enter', recent_circle_id=circle_id)
        if not result['success']:
            print(f'❌ 步骤10失败：{result["message"]}')
            return False
        print('✅ 步骤10完成')
        
        # 所有步骤完成
        print('\n' + '='*60)
        print('📊 测试结果')
        print('='*60)
        print('✅ 所有步骤验证通过')
        print('')
        print('🎉 测试通过！未注册用户 E2E 流程正常！')
        print('='*60)
        
        return True
        
    except Exception as e:
        print(f'\n❌ 测试异常：{str(e)}')
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # 清理测试环境
        if mini:
            print('\n' + '='*60)
            print('🧹 清理测试环境...')
            try:
                exit_test_mode(mini)
                close_miniprogram(mini)
                print('✅ 清理完成')
            except Exception as e:
                print(f'⚠️  清理时发生错误: {str(e)}')


if __name__ == '__main__':
    success = test_unregistered_e2e()
    exit(0 if success else 1)
