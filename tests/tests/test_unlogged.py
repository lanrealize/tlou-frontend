#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
未登录用户完整测试套件

本测试使用 workflow helper 函数验证未登录用户的完整交互流程：
- Main 页面：登录按钮、历史记录、创建朋友圈、刷新推荐、进入朋友圈（MAIN_001-005）
- Details 页面：点赞、评论、设置、回复评论（DETAILS_002-004, 006）

测试策略：
使用 workflow_helper 中封装的测试函数，减少重复代码，提高可维护性
"""

import sys
import io
import os
import time

# 设置标准输出为 UTF-8 编码以支持 emoji
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 添加父目录到路径，以便导入 helpers
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (
    launch_miniprogram,
    close_miniprogram,
    enter_test_mode,
    exit_test_mode,
    check_actions_unregistered_main,
    check_actions_unregistered_details
)


class TestUnloggedUserWorkflow:
    """
    未登录用户工作流测试
    
    测试覆盖：
    - Main 页面交互流程（5个测试点）
    - Details 页面交互流程（4个测试点）
    """
    
    def __init__(self):
        self.mini = None
        self.test_results = {}
        
    def setup(self):
        """初始化测试环境：启动小程序并进入测试模式"""
        print('\n' + '='*60)
        print('🚀 未登录用户工作流测试')
        print('='*60)
        
        self.mini = launch_miniprogram()
        enter_test_mode(self.mini)
        print('✅ 测试环境就绪\n')
        
    def teardown(self):
        """清理测试环境：退出测试模式并关闭小程序"""
        if self.mini:
            print('\n' + '='*60)
            print('🔚 清理测试环境')
            print('='*60)
            time.sleep(1.0)
            exit_test_mode(self.mini)
            close_miniprogram(self.mini)
    
    def test_main_page_workflow(self):
        """
        测试 Main 页面的完整用户交互流程
        
        测试点：
        - 点击登录按钮
        - 点击历史记录
        - 点击创建朋友圈
        - 刷新推荐朋友圈
        - 进入发现的朋友圈
        """
        print('\n' + '='*60)
        print('📱 测试场景：Main 页面交互流程')
        print('='*60)
        
        result = check_actions_unregistered_main(self.mini)
        self.test_results['Main页面'] = result['success']
        
        return result['success']
    
    def test_details_page_workflow(self):
        """
        测试 Details 页面的完整用户交互流程
        
        测试点：
        - 点赞功能
        - 评论功能
        - 设置功能
        - 回复评论功能
        """
        print('\n' + '='*60)
        print('📄 测试场景：Details 页面交互流程')
        print('='*60)
        
        result = check_actions_unregistered_details(self.mini)
        self.test_results['Details页面'] = result['success']
        
        return result['success']
    
    def run_all_tests(self):
        """执行所有测试流程"""
        workflows = [
            ('Main 页面工作流', self.test_main_page_workflow),
            ('Details 页面工作流', self.test_details_page_workflow),
        ]
        
        all_passed = True
        for workflow_name, workflow_method in workflows:
            try:
                if not workflow_method():
                    all_passed = False
            except Exception as e:
                print(f'❌ 工作流 "{workflow_name}" 执行失败: {str(e)}')
                import traceback
                traceback.print_exc()
                all_passed = False
        
        return all_passed
    
    def print_summary(self):
        """打印测试结果汇总"""
        print('\n' + '='*60)
        print('📊 测试结果汇总')
        print('='*60)
        
        passed_count = 0
        failed_count = 0
        
        for test_name, result in self.test_results.items():
            status = '✅ 通过' if result else '❌ 失败'
            print(f'{status} | {test_name}')
            if result:
                passed_count += 1
            else:
                failed_count += 1
        
        print('-'*60)
        total = passed_count + failed_count
        print(f'总计: {total} 个工作流')
        print(f'✅ 通过: {passed_count} 个')
        print(f'❌ 失败: {failed_count} 个')
        if total > 0:
            pass_rate = (passed_count / total) * 100
            print(f'通过率: {pass_rate:.1f}%')
        print('='*60)


if __name__ == '__main__':
    tester = TestUnloggedUserWorkflow()
    tester.setup()
    success = tester.run_all_tests()
    tester.print_summary()
    tester.teardown()
    exit(0 if success else 1)

