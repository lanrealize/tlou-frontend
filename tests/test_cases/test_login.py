#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重构后的用户登录测试 - 使用封装的登录工具函数

测试流程：
1. 启动小程序并进入测试模式
2. 点击登录按钮触发 user-info-popup
3. 使用封装的 complete_user_login() 完成登录
4. 验证登录成功
5. 退出测试模式并清理数据
"""

import sys
import os
import traceback

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (
    launch_miniprogram,
    close_miniprogram,
    enter_test_mode,
    exit_test_mode,
    complete_user_login,
    verify_login_status
)


def test_login_with_refactored_functions():
    """
    使用重构的工具函数进行登录测试
    
    Returns:
        bool: 测试是否通过
    """
    try:
        print('\n📝 开始重构后的登录测试')
        print('='*60)
        
        # 1. 点击登录按钮
        print('1️⃣ 点击登录按钮...')
        
        # 查找并点击登录按钮
        mini = globals().get('mini')
        page = mini.app.current_page
        
        login_btn = page.get_element('.create-btn')
        if not login_btn:
            print('❌ 未找到登录按钮')
            return False
        
        login_btn.tap()
        print('   ✅ 已点击登录按钮')
        
        # 2. 使用封装的登录函数完成整个登录流程
        print('2️⃣ 执行登录流程...')
        
        login_result = complete_user_login(
            mini, 
            nickname='重构测试用户',
            avatar_url='https://tlou.images.wltech-service.site/testResources/testAvatar.jpg'
        )
        
        if not login_result['success']:
            print(f'❌ 登录失败: {login_result["message"]}')
            return False
        
        # 3. 显示登录成功信息
        print('3️⃣ 登录成功!')
        print(f'   ✅ {login_result["message"]}')
        
        user_info = login_result.get('user_info', {})
        if user_info:
            username = user_info.get('username', '')
            user_id = user_info.get('_id', '')
            print(f'   用户名: {username}')
            print(f'   用户ID: {user_id[:8]}...' if user_id else '   用户ID: (无)')
        
        # 4. 可选：验证页面特定的UI变化（针对main页面）
        current_page = mini.app.current_page
        if current_page.path == '/pages/main/main':
            print('4️⃣ 验证main页面UI变化...')
            ui_result = verify_login_status(mini, check_page_ui=True)
            if ui_result.get('page_ui_ok'):
                print('   ✅ 页面UI更新正确')
            else:
                print('   ⚠️  页面UI可能需要检查')
        
        return True
        
    except Exception as e:
        print(f'❌ 测试失败: {str(e)}')
        traceback.print_exc()
        return False


def main():
    """主函数"""
    mini = None
    success = False
    
    try:
        print('\n' + '='*60)
        print('🔐 重构后的用户登录测试')
        print('='*60)
        
        # 1. 启动小程序
        mini = launch_miniprogram()
        
        # 将 mini 设为全局变量，供测试函数使用
        globals()['mini'] = mini
        
        # 2. 进入测试模式
        if not enter_test_mode(mini):
            print('\n❌ 无法进入测试模式，测试终止')
            return
        
        # 3. 执行登录测试
        success = test_login_with_refactored_functions()
        
        # 4. 退出测试模式并清理数据
        print('\n🔄 清理测试环境...')
        if exit_test_mode(mini):
            print('✅ 测试数据已清理')
        else:
            print('⚠️  测试数据清理可能失败')
        
        # 5. 显示测试结果
        print('\n' + '='*60)
        if success:
            print('✅ 重构测试通过！')
            print('🎯 封装的登录工具函数工作正常')
        else:
            print('❌ 重构测试失败')
        print('='*60)
        
    except Exception as e:
        print(f'\n❌ 测试异常: {str(e)}')
        traceback.print_exc()
        
    finally:
        if mini:
            close_miniprogram(mini)


if __name__ == '__main__':
    main()
