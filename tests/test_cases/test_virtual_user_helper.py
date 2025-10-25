#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单测试：验证虚拟用户helper能用
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.helpers import (
    launch_miniprogram,
    close_miniprogram,
    navigate_to_management_page,
    get_virtual_users_list,
    create_virtual_user,
    switch_to_virtual_identity,
    switch_to_real_identity,
    delete_virtual_user,
    get_current_identity
)


def main():
    print('\n' + '='*60)
    print('测试虚拟用户Helper')
    print('='*60)
    
    mini = launch_miniprogram()
    
    try:
        # 1. 导航到管理页面
        print('\n[1] 导航到管理页面...')
        result = navigate_to_management_page(mini)
        assert result['success'], f'导航失败: {result["message"]}'
        print('✅ 导航成功')
        
        # 2. 查询虚拟用户（记录非测试用户数量）
        print('\n[2] 查询虚拟用户列表...')
        users = get_virtual_users_list(mini)
        non_test_count = len([u for u in users['users'] if not u['username'].startswith('TEST_')])
        print(f'✅ 当前有 {users["count"]} 个虚拟用户（其中 {non_test_count} 个非测试用户）')
        
        # 3. 创建虚拟用户（带头像）
        print('\n[3] 创建虚拟用户...')
        result = create_virtual_user(mini, 'TEST_Helper测试用户', avatar_path='test.jpg', auto_navigate=False)
        assert result['success'], f'创建失败: {result["message"]}'
        print(f'✅ 创建成功: {result["user_info"]["username"]}')
        
        # 4. 切换到虚拟身份
        print('\n[4] 切换到虚拟身份...')
        result = switch_to_virtual_identity(mini, username='TEST_Helper测试用户', auto_navigate=False)
        assert result['success'], f'切换失败: {result["message"]}'
        
        identity = get_current_identity(mini)
        assert identity['is_virtual_identity'], '应该是虚拟身份'
        assert identity['user_info']['username'] == 'TEST_Helper测试用户', '用户名应该匹配'
        print(f'✅ 已切换到虚拟身份: {identity["user_info"]["username"]}')
        print('   ℹ️  虚拟身份下，创建表单和用户列表已隐藏（正确行为）')
        
        # 5. 切换回真实身份
        print('\n[5] 切换回真实身份...')
        # 现在切换身份后不会自动返回，直接切换即可
        result = switch_to_real_identity(mini, auto_navigate=False)
        assert result['success'], f'切换失败: {result["message"]}'
        
        identity = get_current_identity(mini)
        assert not identity['is_virtual_identity'], '应该是真实身份'
        print('✅ 已切换回真实身份')
        print('   ℹ️  真实身份下，虚拟用户列表已重新显示（正确行为）')
        
        # 6. 删除虚拟用户
        print('\n[6] 删除测试用户...')
        # 已经在管理页面，不需要重新导航
        result = delete_virtual_user(mini, username='TEST_Helper测试用户', auto_navigate=False)
        assert result['success'], f'删除失败: {result["message"]}'
        print('✅ 删除成功')
        
        # 7. 验证删除成功（只剩非测试用户）
        users = get_virtual_users_list(mini)
        final_non_test_count = len([u for u in users['users'] if not u['username'].startswith('TEST_')])
        assert final_non_test_count == non_test_count, f'非测试用户数量应该是 {non_test_count}，实际: {final_non_test_count}'
        test_users = [u for u in users['users'] if u['username'].startswith('TEST_')]
        assert len(test_users) == 0, f'不应该有测试用户残留: {test_users}'
        print(f'✅ 测试清理完成，虚拟用户数量: {users["count"]} （非测试用户: {final_non_test_count}）')
        
        print('\n' + '='*60)
        print('所有Helper测试通过！')
        print('='*60)
        
    finally:
        close_miniprogram(mini)


if __name__ == '__main__':
    main()

