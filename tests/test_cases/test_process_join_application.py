#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 process_unique_join_application helper
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.helpers import (
    launch_miniprogram,
    close_miniprogram,
    create_circle,
    set_circle_public,
    navigate_to_main,
    create_virtual_user,
    switch_to_virtual_identity,
    switch_to_real_identity,
    delete_virtual_user,
    navigate_to_details,
    apply_to_join_circle,
    process_unique_join_application,
    check_circle_status_action
)


def main():
    print('\n' + '='*60)
    print('测试 process_unique_join_application Helper')
    print('='*60)
    
    mini = launch_miniprogram()
    created_user_id = None
    
    try:
        # 1. 启动小程序（不进入测试模式）
        print('\n[1] 小程序已启动')
        
        # 2. 创建朋友圈
        print('\n[2] 创建朋友圈...')
        circle_result = create_circle(mini)
        assert circle_result['success'], f'创建朋友圈失败: {circle_result["message"]}'
        circle_id = circle_result['circle_id']
        print(f'✅ 朋友圈创建成功: {circle_id[:8]}...')
        
        # 2.5. 设置朋友圈为公开
        print('\n[2.5] 设置朋友圈为公开...')
        public_result = set_circle_public(mini, circle_id=circle_id)
        assert public_result['success'], f'设置公开失败: {public_result["message"]}'
        print('✅ 朋友圈已设置为公开')
        
        # 3. 返回 main 页面（清空页面栈）
        print('\n[3] 返回 main 页面...')
        nav_result = navigate_to_main(mini, use_relaunch=True)
        assert nav_result['success'], f'导航失败: {nav_result["message"]}'
        print('✅ 已返回 main 页面')
        
        # 4. 创建虚拟用户
        print('\n[4] 创建虚拟用户...')
        user_result = create_virtual_user(mini, 'TEST_申请用户', avatar_path='test.jpg', auto_navigate=True)
        assert user_result['success'], f'创建虚拟用户失败: {user_result["message"]}'
        user_info = user_result['user_info']
        created_user_id = user_info['_id']
        print(f'✅ 虚拟用户创建成功: {user_info["username"]}')
        
        # 5. 切换到虚拟身份
        print('\n[5] 切换到虚拟身份...')
        switch_result = switch_to_virtual_identity(mini, username=user_info['username'], auto_navigate=False)
        assert switch_result['success'], f'切换失败: {switch_result["message"]}'
        print(f'✅ 已切换到虚拟身份: {user_info["username"]}')
        
        # 6. 导航到朋友圈 details 页面
        print('\n[6] 导航到朋友圈...')
        nav_result = navigate_to_details(mini, circle_id)
        assert nav_result['success'], f'导航失败: {nav_result["error"]}'
        print('✅ 已进入朋友圈 details 页面')
        
        # 7a. 验证申请前状态
        print('\n[7a] 验证申请前底部状态...')
        status_result = check_circle_status_action(mini, 'can_apply')
        assert status_result['match'], f'状态验证失败: {status_result["errors"]}'
        print(f'✅ 底部状态正确: {status_result["user_status"]}')
        
        # 7b. 点击申请加入按钮
        print('\n[7b] 申请加入朋友圈...')
        apply_result = apply_to_join_circle(mini)
        assert apply_result['success'], f'申请失败: {apply_result["message"]}'
        print('✅ 申请已提交')
        
        # 7c. 验证申请后状态
        print('\n[7c] 验证申请后底部状态...')
        status_result = check_circle_status_action(mini, 'applied')
        assert status_result['match'], f'状态验证失败: {status_result["errors"]}'
        print(f'✅ 底部状态已变为: {status_result["user_status"]}')
        
        # 8. 返回 main 页面（清空页面栈）
        print('\n[8] 返回 main 页面...')
        nav_result = navigate_to_main(mini, use_relaunch=True)
        assert nav_result['success'], f'导航失败: {nav_result["message"]}'
        print('✅ 已返回 main 页面')
        
        # 9. 切回真实身份
        print('\n[9] 切回真实身份...')
        switch_result = switch_to_real_identity(mini, auto_navigate=True)
        assert switch_result['success'], f'切换失败: {switch_result["message"]}'
        print('✅ 已切回真实身份')
        
        # 10. 接受申请
        print('\n[10] 接受申请...')
        process_result = process_unique_join_application(mini, circle_id=circle_id, action='approve')
        assert process_result['success'], f'处理申请失败: {process_result["message"]}'
        print(f'✅ 申请处理成功: {process_result["applicant_username"]} 已加入朋友圈')
        print(f'   成员数变化: {process_result["members_before"]} -> {process_result["members_after"]}')
        
        # 11. 清理虚拟用户
        print('\n[11] 清理虚拟用户...')
        delete_result = delete_virtual_user(mini, user_id=created_user_id, auto_navigate=True)
        assert delete_result['success'], f'删除失败: {delete_result["message"]}'
        print(f'✅ 虚拟用户已清理: {delete_result["deleted_user"]["username"]}')
        
        print('\n' + '='*60)
        print('✅ 测试通过！')
        print('='*60)
        
    except AssertionError as e:
        print(f'\n❌ 测试失败: {str(e)}')
        raise
        
    except Exception as e:
        print(f'\n❌ 测试异常: {str(e)}')
        import traceback
        traceback.print_exc()
        raise
        
    finally:
        # 清理虚拟用户（如果还存在）
        if created_user_id:
            try:
                delete_virtual_user(mini, user_id=created_user_id, auto_navigate=True)
            except:
                pass
        
        close_miniprogram(mini)


if __name__ == '__main__':
    main()

