#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 check_latest_circle helper

测试流程：
1. 用户登录
2. 验证最近朋友圈为空（新用户场景）
"""

import sys
import io
import os
import time

# 设置标准输出为 UTF-8 编码以支持 emoji
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (
    launch_miniprogram,
    close_miniprogram,
    enter_test_mode,
    exit_test_mode,
    complete_user_login
)

from helpers.circle_helper import check_latest_circle


class CheckLatestCircleTest:
    """check_latest_circle helper 测试类"""
    
    def __init__(self):
        self.mini = None
        self.test_data = {}
        
    def setup(self):
        """设置测试环境"""
        print('\n' + '='*60)
        print('🧪 测试 check_latest_circle helper')
        print('='*60)
        
        # 启动小程序
        self.mini = launch_miniprogram()
        
        # 进入测试模式（内部会自动清理残留状态）
        if not enter_test_mode(self.mini):
            raise Exception('无法进入测试模式')
        
    def teardown(self):
        """清理测试环境"""
        if self.mini:
            print('\n🔄 清理测试环境...')
            
            # 在清理之前先导航到首页，避免404错误
            try:
                current_page = self.mini.app.current_page
                if 'main' not in current_page.path:
                    print('   📍 导航到首页以避免404错误...')
                    self.mini.app.navigate_to('/pages/main/main')
                    time.sleep(1.0)
            except Exception as e:
                print(f'   ⚠️  导航到首页失败，但继续清理: {str(e)}')
            
            exit_test_mode(self.mini)
            close_miniprogram(self.mini)
    
    def step_1_user_login(self):
        """步骤1：用户登录"""
        print('\n1️⃣ 用户登录...')
        
        # 点击登录按钮
        page = self.mini.app.current_page
        login_btn = page.get_element('.create-btn')
        if not login_btn:
            raise Exception('未找到登录按钮')
        
        login_btn.tap()
        time.sleep(0.3)
        
        # 完成登录
        login_result = complete_user_login(self.mini, '测试用户-最近朋友圈')
        
        if not login_result['success']:
            raise Exception(f'登录失败: {login_result["message"]}')
        
        self.test_data['user_info'] = login_result['user_info']
        print(f'   ✅ 登录成功: {login_result["user_info"]["username"]}')
        
    def step_2_check_empty_latest_circle(self):
        """步骤2：验证最近朋友圈为空"""
        print('\n2️⃣ 验证最近朋友圈为空...')
        
        # 调用 check_latest_circle，期望为空
        result = check_latest_circle(self.mini, expect_empty=True)
        
        if not result['success']:
            raise Exception(f'验证失败: {result["message"]}')
        
        print(f'   ✅ 验证成功: {result["message"]}')
        print(f'   ℹ️  is_empty: {result["is_empty"]}')
        
    def run(self):
        """运行测试"""
        try:
            # 设置测试环境
            self.setup()
            
            # 执行测试步骤
            self.step_1_user_login()
            self.step_2_check_empty_latest_circle()
            
            # 打印测试结果
            print('\n' + '='*60)
            print('✅ 所有测试步骤完成')
            print('='*60)
            print('\n🎉 测试通过！check_latest_circle helper 工作正常！')
            
            return True
            
        except Exception as e:
            print(f'\n❌ 测试失败: {str(e)}')
            import traceback
            traceback.print_exc()
            return False
            
        finally:
            # 清理测试环境
            self.teardown()


def main():
    """主函数"""
    test = CheckLatestCircleTest()
    success = test.run()
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())

