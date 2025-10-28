"""
测试：未注册用户通过邀请链接加入朋友圈的完整E2E流程

测试步骤：
1a. 启动小程序
1b. 记录真实身份 userinfo
2. 切换为未登录状态
3a. 通过分享链接进入详情页（带邀请码）
3b. 检查圈子状态为 guest_invited
4. 点击"接受邀请"按钮
5a. 完成用户登录（注册）
5b. 记录测试身份 userinfo
6. 检查圈子状态为 member
7. 检查成员在详情页的操作权限
8. 返回主页
9. 检查注册用户在主页的操作权限
10. 退出测试模式

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
from tests.helpers.auth_helper import get_user_state, complete_user_login
from tests.helpers.navigation_helper import navigate_to_details_from_share, navigate_to_main
from tests.helpers.circle_helper import check_circle_status_action, accept_to_join_circle
from tests.helpers.workflow_helper import check_actions_member_details, check_actions_registered_main


# 测试配置
TEST_CONFIG = {
    'test_nickname': '测试用户',
    'test_avatar': 'https://tlou.images.wltech-service.site/testResources/testAvatar.jpg',
    'test_images': [
        os.path.join(project_root, 'tests', 'resources', 'test.jpg'),
        os.path.join(project_root, 'tests', 'resources', 'test1.jpg'),
        os.path.join(project_root, 'tests', 'resources', 'test2.jpg')
    ],
    # 测试数据：暂时只测试公开朋友圈（私有朋友圈需要后端支持未登录用户通过邀请码访问）
    'circles': [
        {
            'circle_id': '6900ec7520ac2a3520677c34',
            'invite_code': '1687F5',
            'type': '公开',
            'description': '公开朋友圈邀请测试'
        }
        # TODO: 私有朋友圈测试需要等待后端支持未登录用户通过邀请码访问
        # {
        #     'circle_id': '6900ecc020ac2a3520677ca1',
        #     'invite_code': '7064B3',
        #     'type': '私有',
        #     'description': '私有朋友圈邀请测试'
        # }
    ]
}


def test_invite_workflow_for_circle(mini, real_user_info, circle_config):
    """测试未注册用户通过邀请链接加入朋友圈的完整流程"""
    circle_id = circle_config['circle_id']
    invite_code = circle_config['invite_code']
    circle_type = circle_config['type']
    description = circle_config['description']

    print(f'\n{"="*60}')
    print(f'开始测试：{description}')
    print(f'类型：{circle_type}')
    print(f'圈子ID: {circle_id}')
    print(f'邀请码: {invite_code}')
    print(f'{"="*60}')

    try:
        # 步骤2: system_helper.py -> enter_test_mode(mini) 切换为未登录状态
        print('\n【步骤2】切换为未登录状态')
        print('-'*60)
        enter_test_mode(mini)
        time.sleep(1)
        print('✅ 步骤2完成')

        # 步骤3a: navigation_helper.py -> navigate_to_details_from_share(mini, circle_id, inviter_id)
        print('\n【步骤3a】通过分享链接进入详情页')
        print('-'*60)
        nav_result = navigate_to_details_from_share(mini, circle_id=circle_id, invite_code=invite_code)
        if not nav_result['success']:
            print(f'❌ 步骤3a失败：{nav_result["error"]}')
            return False
        print('✅ 步骤3a完成')

        # 步骤3b: circle_helper.py -> check_circle_status_action(mini, expected_user_status) "guest_invited"
        print('\n【步骤3b】检查圈子状态')
        print('-'*60)
        status_result = check_circle_status_action(mini, expected_user_status='guest_invited')
        if not status_result['match']:
            print(f'❌ 步骤3b失败：状态验证失败')
            for error in status_result.get('errors', []):
                print(f'   {error}')
            return False
        print('✅ 步骤3b完成：状态为 guest_invited')

        # 步骤4: circle_helper.py -> accept_to_join_circle(mini)
        print('\n【步骤4】接受邀请加入朋友圈')
        print('-'*60)
        accept_result = accept_to_join_circle(mini)
        if not accept_result['success']:
            print(f'❌ 步骤4失败：{accept_result["message"]}')
            return False
        print('✅ 步骤4完成')

        # 步骤5a: auth_helper.py -> complete_user_login(mini, nickname='测试用户', avatar_url='...')
        print('\n【步骤5a】完成用户登录')
        print('-'*60)
        login_result = complete_user_login(
            mini,
            nickname=TEST_CONFIG['test_nickname'],
            avatar_url=TEST_CONFIG['test_avatar']
        )
        if not login_result['success']:
            print(f'❌ 步骤5a失败：{login_result["message"]}')
            return False
        print(f'✅ 步骤5a完成：用户登录成功（{login_result["user_info"]["username"]}）')

        # 步骤5b: auth_helper.py -> get_user_state(mini) 记录测试身份userinfo
        print('\n【步骤5b】记录测试身份userinfo')
        print('-'*60)
        test_user_info = get_user_state(mini)
        print(f'   测试用户: {test_user_info["user_info"]["username"]}')
        print(f'   用户ID: {test_user_info["user_info"]["_id"][:12]}...')
        print('✅ 步骤5b完成')

        # 步骤6: circle_helper.py -> check_circle_status_action(mini, expected_user_status) "member"
        print('\n【步骤6】检查圈子状态')
        print('-'*60)
        status_result = check_circle_status_action(mini, expected_user_status='member')
        if not status_result['match']:
            print(f'❌ 步骤6失败：状态验证失败')
            for error in status_result.get('errors', []):
                print(f'   {error}')
            return False
        print('✅ 步骤6完成：状态为 member')

        # 步骤7: workflow_helper.py -> check_actions_member_details(mini, circle_id, test_images)
        print('\n【步骤7】检查成员在详情页的操作')
        print('-'*60)
        member_details_result = check_actions_member_details(mini, circle_id, TEST_CONFIG['test_images'])
        if not member_details_result['success']:
            print(f'❌ 步骤7失败：{member_details_result["message"]}')
            return False
        print('✅ 步骤7完成')

        # 步骤8: navigation_helper.py -> navigate_to_main(mini, use_relaunch=False)
        print('\n【步骤8】返回主页')
        print('-'*60)
        nav_main_result = navigate_to_main(mini, use_relaunch=False)
        if not nav_main_result['success']:
            print(f'❌ 步骤8失败：{nav_main_result["message"]}')
            return False
        print('✅ 步骤8完成')

        # 步骤9: workflow_helper.py -> check_actions_registered_main(mini, check_recent_circle='enter', recent_circle_id=circle_id)
        print('\n【步骤9】检查注册用户在主页的操作')
        print('-'*60)
        registered_main_result = check_actions_registered_main(mini, check_recent_circle='enter', recent_circle_id=circle_id)
        if not registered_main_result['success']:
            print(f'❌ 步骤9失败：{registered_main_result["message"]}')
            return False
        print('✅ 步骤9完成')

        # 步骤10: system_helper.py -> exit_test_mode(mini)
        print('\n【步骤10】退出测试模式')
        print('-'*60)
        exit_test_mode(mini)
        time.sleep(1)
        print('✅ 步骤10完成')

        print(f'\n✅ {description} 测试成功！')
        return True

    except Exception as e:
        print(f'\n❌ {description} 测试失败！')
        import traceback
        traceback.print_exc()
        return False


def test_unregistered_invite_e2e():
    """主测试函数"""
    print('\n' + '='*60)
    print('开始测试：未注册用户邀请链接 E2E 流程')
    print('='*60)

    mini = None
    all_passed = True

    try:
        # 步骤1a: system_helper.py -> launch_miniprogram()
        print('\n【步骤1a】启动小程序')
        print('-'*60)
        mini = launch_miniprogram()
        print('✅ 步骤1a完成')

        # 步骤1b: auth_helper.py -> get_user_state(mini) 记录真实身份
        print('\n【步骤1b】记录真实身份')
        print('-'*60)
        real_user_info = get_user_state(mini)
        print(f'   真实用户: {real_user_info["user_info"]["username"]}')
        print(f'   用户ID: {real_user_info["user_info"]["_id"][:12]}...')
        print('✅ 步骤1b完成')

        # 对每个测试圈子执行流程
        for circle_config in TEST_CONFIG['circles']:
            result = test_invite_workflow_for_circle(mini, real_user_info, circle_config)
            if not result:
                all_passed = False

        # 输出最终结果
        print('\n' + '='*60)
        print('📊 测试结果')
        print('='*60)
        if all_passed:
            print('✅ 所有测试通过')
        else:
            print('❌ 部分测试失败')
        print('='*60)

    except Exception as e:
        print(f'\n❌ 测试执行异常: {str(e)}')
        import traceback
        traceback.print_exc()
        all_passed = False

    finally:
        # 清理
        if mini:
            print('\n' + '='*60)
            print('🧹 清理测试环境...')
            try:
                exit_test_mode(mini)
            except:
                pass
            close_miniprogram(mini)
            print('✅ 清理完成')

    return all_passed


if __name__ == '__main__':
    success = test_unregistered_invite_e2e()
    sys.exit(0 if success else 1)

