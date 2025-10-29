"""
测试：未注册用户申请加入朋友圈的完整E2E流程

测试步骤：
1a. 启动小程序
1b. 记录真实身份 userinfo
2a. 创建圈子并记录 circle_id
2b. 设置圈子为公开
3. 返回主页（relaunch）
4a. 切换为未登录状态
5. 进入详情页（从发现页进入）
6. 检查圈子状态为 guest_can_apply
7. 点击"申请加入"按钮
8a. 完成用户登录（注册）
8b. 记录测试身份 userinfo
9. 检查圈子状态为 applied
10. 返回主页（relaunch）
11. 切换回真实身份
12. 进入详情页（从发现页进入）
13. 检查圈子状态为 member
14. 同意用户加入圈子
15. 返回主页（relaunch）
16. 切换到测试身份
17. 进入详情页（从发现页进入）
18. 检查圈子状态为 member
19. 检查成员在详情页的操作权限
20. 返回主页（不用relaunch）
21. 检查注册用户在主页的操作权限

清理工作（finally块自动执行）：
- 删除测试创建的圈子
- 退出测试模式
- 关闭小程序

作者：测试团队
日期：2025-10-29
"""

import sys
import os
import time

# 添加项目根目录到Python路径
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, project_root)

from tests.helpers.system_helper import launch_miniprogram, close_miniprogram, enter_test_mode, exit_test_mode
from tests.helpers.auth_helper import get_user_state, complete_user_login, switch_to_identity
from tests.helpers.navigation_helper import navigate_to_details, navigate_to_main
from tests.helpers.circle_helper import (
    create_circle,
    set_circle_public,
    check_circle_status_action,
    process_unique_join_application,
    delete_circle_by_api
)
from tests.helpers.element_helper import click_apply_join_button
from tests.helpers.workflow_helper import check_actions_member_details, check_actions_registered_main


# 测试配置
TEST_CONFIG = {
    'test_nickname': '测试用户',
    'test_avatar': 'https://tlou.images.wltech-service.site/testResources/testAvatar.jpg',
    'test_images': [
        os.path.join(project_root, 'tests', 'resources', 'test.jpg'),
        os.path.join(project_root, 'tests', 'resources', 'test1.jpg'),
        os.path.join(project_root, 'tests', 'resources', 'test2.jpg')
    ]
}


def test_unregistered_apply_e2e():
    """主测试函数：未注册用户申请加入朋友圈的完整E2E流程"""
    print('\n' + '='*60)
    print('开始测试：未注册用户申请加入 E2E 流程')
    print('='*60)

    mini = None
    real_user_info = None
    test_user_info = None
    circle_id = None

    try:
        # 步骤1a: system_helper.py -> launch_miniprogram()
        print('\n【步骤1a】启动小程序')
        print('-'*60)
        mini = launch_miniprogram()
        print('✅ 步骤1a完成')

        # 步骤1b: auth_helper.py -> get_user_state(mini) 记录真实身份 userinfo
        print('\n【步骤1b】记录真实身份 userinfo')
        print('-'*60)
        real_user_info = get_user_state(mini)
        print(f'   真实用户: {real_user_info["user_info"]["username"]}')
        print(f'   用户ID: {real_user_info["user_info"]["_id"][:12]}...')
        print('✅ 步骤1b完成')

        # 步骤2a: circle_helper.py -> create_circle(mini) + 记录生成的circle_id
        print('\n【步骤2a】创建圈子')
        print('-'*60)
        create_result = create_circle(mini)
        if not create_result['success']:
            print(f'❌ 步骤2a失败：{create_result["message"]}')
            return False
        circle_id = create_result['circle_id']
        print(f'✅ 步骤2a完成：圈子ID = {circle_id}')

        # 步骤2b: circle_helper.py -> set_circle_public(mini, circle_id=None)
        print('\n【步骤2b】设置圈子为公开')
        print('-'*60)
        set_public_result = set_circle_public(mini, circle_id=None)
        if not set_public_result['success']:
            print(f'❌ 步骤2b失败：{set_public_result["message"]}')
            return False
        print('✅ 步骤2b完成')

        # 步骤3: navigation_helper.py -> navigate_to_main(mini, use_relaunch=True)
        print('\n【步骤3】返回主页（relaunch）')
        print('-'*60)
        nav_result = navigate_to_main(mini, use_relaunch=True)
        if not nav_result['success']:
            print(f'❌ 步骤3失败：{nav_result["message"]}')
            return False
        print('✅ 步骤3完成')

        # 步骤4a: system_helper.py -> enter_test_mode(mini) 切换为未登录状态
        print('\n【步骤4a】切换为未登录状态')
        print('-'*60)
        enter_test_mode(mini)
        time.sleep(1)
        print('✅ 步骤4a完成')

        # 步骤5: navigation_helper.py -> navigate_to_details(mini, circle_id, source='discover')
        print('\n【步骤5】进入详情页（从发现页进入）')
        print('-'*60)
        nav_details_result = navigate_to_details(mini, circle_id, source='discover')
        if not nav_details_result['success']:
            print(f'❌ 步骤5失败：{nav_details_result["error"]}')
            return False
        print('✅ 步骤5完成')

        # 步骤6: circle_helper.py -> check_circle_status_action(mini, expected_user_status) "guest_can_apply"
        print('\n【步骤6】检查圈子状态为 guest_can_apply')
        print('-'*60)
        status_result = check_circle_status_action(mini, expected_user_status='guest_can_apply')
        if not status_result['match']:
            print(f'❌ 步骤6失败：状态验证失败')
            for error in status_result.get('errors', []):
                print(f'   {error}')
            return False
        print('✅ 步骤6完成：状态为 guest_can_apply')

        # 步骤7: element_helper.py -> click_apply_join_button(mini)
        print('\n【步骤7】点击"申请加入"按钮')
        print('-'*60)
        click_result = click_apply_join_button(mini)
        if not click_result['success']:
            print(f'❌ 步骤7失败：{click_result["message"]}')
            return False
        print('✅ 步骤7完成')

        # 步骤8a: auth_helper.py -> complete_user_login(mini, nickname='测试用户', avatar_url='...')
        print('\n【步骤8a】完成用户登录')
        print('-'*60)
        login_result = complete_user_login(
            mini,
            nickname=TEST_CONFIG['test_nickname'],
            avatar_url=TEST_CONFIG['test_avatar']
        )
        if not login_result['success']:
            print(f'❌ 步骤8a失败：{login_result["message"]}')
            return False
        print(f'✅ 步骤8a完成：用户登录成功（{login_result["user_info"]["username"]}）')

        # 步骤8b: auth_helper.py -> get_user_state(mini) 记录测试身份 userinfo
        print('\n【步骤8b】记录测试身份 userinfo')
        print('-'*60)
        test_user_info = get_user_state(mini)
        print(f'   测试用户: {test_user_info["user_info"]["username"]}')
        print(f'   用户ID: {test_user_info["user_info"]["_id"][:12]}...')
        print('✅ 步骤8b完成')

        # 步骤9: circle_helper.py -> check_circle_status_action(mini, expected_user_status) "applied"
        print('\n【步骤9】检查圈子状态为 applied')
        print('-'*60)
        status_result = check_circle_status_action(mini, expected_user_status='applied')
        if not status_result['match']:
            print(f'❌ 步骤9失败：状态验证失败')
            for error in status_result.get('errors', []):
                print(f'   {error}')
            return False
        print('✅ 步骤9完成：状态为 applied')

        # 步骤10: navigation_helper.py -> navigate_to_main(mini, use_relaunch=True)
        print('\n【步骤10】返回主页（relaunch）')
        print('-'*60)
        nav_result = navigate_to_main(mini, use_relaunch=True)
        if not nav_result['success']:
            print(f'❌ 步骤10失败：{nav_result["message"]}')
            return False
        print('✅ 步骤10完成')

        # 步骤11: auth_helper.py -> switch_to_identity(mini, user_info, identity_type='test')
        print('\n【步骤11】切换回真实身份')
        print('-'*60)
        switch_result = switch_to_identity(mini, real_user_info['user_info'], identity_type='test')
        if not switch_result['success']:
            print(f'❌ 步骤11失败：{switch_result["message"]}')
            return False
        print(f'✅ 步骤11完成：切换到 {real_user_info["user_info"]["username"]}')

        # 步骤12: navigation_helper.py -> navigate_to_details(mini, circle_id, source='discover')
        print('\n【步骤12】进入详情页（从发现页进入）')
        print('-'*60)
        nav_details_result = navigate_to_details(mini, circle_id, source='discover')
        if not nav_details_result['success']:
            print(f'❌ 步骤12失败：{nav_details_result["error"]}')
            return False
        print('✅ 步骤12完成')

        # 步骤13: circle_helper.py -> check_circle_status_action(mini, expected_user_status) "member"
        print('\n【步骤13】检查圈子状态为 member')
        print('-'*60)
        status_result = check_circle_status_action(mini, expected_user_status='member')
        if not status_result['match']:
            print(f'❌ 步骤13失败：状态验证失败')
            for error in status_result.get('errors', []):
                print(f'   {error}')
            return False
        print('✅ 步骤13完成：状态为 member')

        # 步骤14: circle_helper.py -> process_unique_join_application(mini, circle_id=circle_id, action='approve')
        print('\n【步骤14】同意用户加入圈子')
        print('-'*60)
        approve_result = process_unique_join_application(mini, circle_id=circle_id, action='approve')
        if not approve_result['success']:
            print(f'❌ 步骤14失败：{approve_result["message"]}')
            return False
        print('✅ 步骤14完成')

        # 步骤15: navigation_helper.py -> navigate_to_main(mini, use_relaunch=True)
        print('\n【步骤15】返回主页（relaunch）')
        print('-'*60)
        nav_result = navigate_to_main(mini, use_relaunch=True)
        if not nav_result['success']:
            print(f'❌ 步骤15失败：{nav_result["message"]}')
            return False
        print('✅ 步骤15完成')

        # 步骤16: auth_helper.py -> switch_to_identity(mini, user_info, identity_type='test')
        print('\n【步骤16】切换到测试身份')
        print('-'*60)
        switch_result = switch_to_identity(mini, test_user_info['user_info'], identity_type='test')
        if not switch_result['success']:
            print(f'❌ 步骤16失败：{switch_result["message"]}')
            return False
        print(f'✅ 步骤16完成：切换到 {test_user_info["user_info"]["username"]}')

        # 步骤17: navigation_helper.py -> navigate_to_details(mini, circle_id, source='discover')
        print('\n【步骤17】进入详情页（从发现页进入）')
        print('-'*60)
        nav_details_result = navigate_to_details(mini, circle_id, source='discover')
        if not nav_details_result['success']:
            print(f'❌ 步骤17失败：{nav_details_result["error"]}')
            return False
        print('✅ 步骤17完成')

        # 步骤18: circle_helper.py -> check_circle_status_action(mini, expected_user_status) "member"
        print('\n【步骤18】检查圈子状态为 member')
        print('-'*60)
        status_result = check_circle_status_action(mini, expected_user_status='member')
        if not status_result['match']:
            print(f'❌ 步骤18失败：状态验证失败')
            for error in status_result.get('errors', []):
                print(f'   {error}')
            return False
        print('✅ 步骤18完成：状态为 member')

        # 步骤19: workflow_helper.py -> check_actions_member_details(mini, circle_id, test_images)
        print('\n【步骤19】检查成员在详情页的操作权限')
        print('-'*60)
        member_details_result = check_actions_member_details(mini, circle_id, TEST_CONFIG['test_images'])
        if not member_details_result['success']:
            print(f'❌ 步骤19失败：{member_details_result["message"]}')
            return False
        print('✅ 步骤19完成')

        # 步骤20: navigation_helper.py -> navigate_to_main(mini, use_relaunch=False)
        print('\n【步骤20】返回主页（不用relaunch）')
        print('-'*60)
        nav_result = navigate_to_main(mini, use_relaunch=False)
        if not nav_result['success']:
            print(f'❌ 步骤20失败：{nav_result["message"]}')
            return False
        print('✅ 步骤20完成')

        # 步骤21: workflow_helper.py -> check_actions_registered_main(mini, check_recent_circle='enter', recent_circle_id=circle_id)
        print('\n【步骤21】检查注册用户在主页的操作权限')
        print('-'*60)
        registered_main_result = check_actions_registered_main(mini, check_recent_circle='enter', recent_circle_id=circle_id)
        if not registered_main_result['success']:
            print(f'❌ 步骤21失败：{registered_main_result["message"]}')
            return False
        print('✅ 步骤21完成')

        # 输出最终结果
        print('\n' + '='*60)
        print('📊 测试结果')
        print('='*60)
        print('✅ 所有测试通过')
        print('='*60)
        return True

    except Exception as e:
        print(f'\n❌ 测试执行异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

    finally:
        # 清理
        if mini:
            print('\n' + '='*60)
            print('🧹 清理测试环境...')
            # 先退出测试模式（恢复真实用户身份）
            try:
                exit_test_mode(mini)
            except:
                pass
            # 然后删除测试创建的圈子（需要真实用户权限）
            if circle_id:
                try:
                    delete_circle_by_api(mini, circle_id)
                except Exception as e:
                    print(f'   ⚠️  删除圈子失败: {str(e)}')
            close_miniprogram(mini)
            print('✅ 清理完成')


if __name__ == '__main__':
    success = test_unregistered_apply_e2e()
    sys.exit(0 if success else 1)

