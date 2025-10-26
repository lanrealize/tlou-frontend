#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试示例：测试模式下的身份切换

展示如何使用新的身份切换功能：
1. 进入测试模式
2. 注册测试用户
3. 切换到真实身份（保留测试数据）
4. 切换回测试身份
5. 最终清理
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.helpers import (
    launch_miniprogram,
    close_miniprogram,
    enter_test_mode,
    exit_test_mode,
    complete_user_login,
    get_user_state,
    switch_to_identity
)


def test_identity_switch_flow():
    """测试：测试模式下的完整身份切换流程（使用 switchToTemporaryIdentity）"""
    
    print('\n' + '='*60)
    print('测试：测试模式下的身份切换')
    print('='*60)
    
    mini = launch_miniprogram()
    
    try:
        # ==========================================
        # 1. 进入测试模式
        # ==========================================
        print('\n[1] 进入测试模式...')
        result = enter_test_mode(mini)
        assert result, '进入测试模式失败'
        print('✅ 测试模式已启动')
        
        # ==========================================
        # 2. 完成测试用户注册
        # ==========================================
        print('\n[2] 注册测试用户...')
        login_result = complete_user_login(mini, nickname='测试用户A')
        assert login_result['success'], f'注册失败: {login_result["message"]}'
        
        # 🎯 保存测试用户信息（关键步骤）
        test_user_info = login_result['user_info']
        print(f'✅ 测试用户注册成功: {test_user_info["username"]}')
        print(f'   用户ID: {test_user_info["_id"]}')
        
        # ==========================================
        # 3. 获取真实用户信息（可选：如果需要切换到真实身份）
        # ==========================================
        print('\n[3] 获取真实用户信息...')
        # 在实际测试中，需要从某处获取真实用户信息
        # 这里简化为示例
        real_user_info = {
            '_id': 'real_openid_example',
            'username': '真实用户',
            'avatar': 'https://example.com/avatar.jpg'
        }
        print(f'✅ 真实用户: {real_user_info["username"]}')
        
        # ==========================================
        # 4. 临时切换到真实身份（不退出测试模式）
        # ==========================================
        print('\n[4] 临时切换到真实身份...')
        
        # 使用 switchToTemporaryIdentity 切换
        result = switch_to_identity(mini, real_user_info, 'real')
        assert result['success'], f'切换失败: {result["message"]}'
        
        # 验证已切换到真实身份
        identity = result['identity']
        print(f'✅ 当前身份: {identity["user_info"]["username"]}')
        print(f'   注意：Storage 中的 openid 仍是测试 openid')
        
        # ==========================================
        # 5. 以真实身份做一些操作
        # ==========================================
        print('\n[5] 以真实身份执行操作...')
        # 这里可以进行需要真实身份的操作
        print('✅ 真实身份操作完成')
        
        # ==========================================
        # 6. 切换回测试身份
        # ==========================================
        print('\n[6] 切换回测试身份...')
        
        # 使用保存的测试用户信息切换
        result = switch_to_identity(mini, test_user_info, 'test')
        assert result['success'], f'切换失败: {result["message"]}'
        
        # 验证已切换回测试身份
        identity = result['identity']
        assert identity['user_info']['username'] == '测试用户A', '用户名不匹配'
        print(f'✅ 已切换回测试身份: {identity["user_info"]["username"]}')
        
        # ==========================================
        # 7. 继续以测试身份进行测试
        # ==========================================
        print('\n[7] 继续测试...')
        # 这里可以进行各种测试操作
        print('✅ 测试身份工作正常')
        
        # ==========================================
        # 8. 最终清理：结束测试模式（一次性清理所有数据）
        # ==========================================
        print('\n[8] 清理测试数据...')
        result = exit_test_mode(mini)
        assert result, '清理失败'
        print('✅ 测试数据已清理')
        
        print('\n' + '='*60)
        print('✅ 测试完成！身份切换流程验证通过')
        print('='*60)
        
        return True
        
    except AssertionError as e:
        print(f'\n❌ 测试失败: {str(e)}')
        return False
        
    except Exception as e:
        print(f'\n❌ 测试异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # 确保清理
        try:
            exit_test_mode(mini)
        except:
            pass
        close_miniprogram(mini)


def main():
    """运行测试"""
    success = test_identity_switch_flow()
    
    if success:
        print('\n🎉 测试通过！')
    else:
        print('\n⚠️  测试失败')
    
    return success


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

