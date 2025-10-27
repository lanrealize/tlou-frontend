#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 check_toast helper 是否有效

测试场景：未加入朋友圈的用户尝试点赞，应该显示 "请先申请加入" toast
"""

import sys
import os

# 添加项目根目录到 Python 路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

import time
from tests.helpers.system_helper import launch_miniprogram, close_miniprogram
from tests.helpers.navigation_helper import navigate_to_details
from tests.helpers.post_helper import like_post
from tests.helpers.common_helper import check_toast


def test_toast_on_unauthorized_like():
    """
    测试未授权点赞时的 Toast 提示
    
    测试步骤：
    1. 启动小程序（不进入测试模式，保持未登录/未加入状态）
    2. 导航到指定朋友圈 (68ff891795ba239deab452ea)
    3. 尝试点赞帖子
    4. 验证 toast 是否为 "请先申请加入"
    """
    mini = None
    
    try:
        print('\n' + '='*60)
        print('🧪 测试 check_toast helper')
        print('='*60)
        
        # 步骤1：启动小程序（不进入测试模式）
        print('\n【步骤1】启动小程序（非测试模式）')
        mini = launch_miniprogram()
        
        # 步骤2：导航到指定朋友圈
        print('\n【步骤2】导航到朋友圈 68ff891795ba239deab452ea')
        circle_id = '68ff891795ba239deab452ea'
        nav_result = navigate_to_details(mini, circle_id, source='discover')
        
        if not nav_result['success']:
            raise Exception(f"导航失败: {nav_result.get('error', '未知错误')}")
        
        print(f'   ✅ 成功进入朋友圈: {circle_id}')
        
        # 等待页面加载完成
        time.sleep(1.0)
        
        # 步骤3：获取第一个帖子的ID
        print('\n【步骤3】获取帖子列表')
        page = mini.app.current_page
        posts = page.data.get('posts', [])
        
        if not posts or len(posts) == 0:
            raise Exception('当前朋友圈没有帖子')
        
        first_post = posts[0]
        post_id = first_post.get('_id') or first_post.get('id')
        print(f'   📝 找到帖子，ID: {post_id}')
        print(f'   📝 帖子内容: {first_post.get("content", "")[:50]}...')
        
        # 步骤4：记录当前时间戳（用于过滤之前的 toast）
        before_like_time = time.time()
        
        # 步骤5：尝试点赞（预期会失败并显示 toast）
        print('\n【步骤4】尝试点赞帖子（预期失败）')
        like_result = like_post(mini, post_id, expect_success=False)
        
        # 等待 Toast 显示并停留，方便肉眼确认
        print('   ⏳ 等待 Toast 显示（停留 0.5 秒方便确认）...')
        time.sleep(0.5)
        
        # 步骤6：检查 toast
        print('\n【步骤5】检查 Toast 提示')
        toast_result = check_toast(mini, expected_text="请先申请加入", since=before_like_time)
        
        # 验证结果
        print('\n' + '='*60)
        print('📊 测试结果')
        print('='*60)
        
        if toast_result['success']:
            print(f'✅ 成功获取到 Toast')
            print(f'   Toast 内容: "{toast_result["text"]}"')
            
            if toast_result['match']:
                print(f'✅ Toast 内容匹配预期: "请先申请加入"')
                print('\n🎉 测试通过！check_toast helper 工作正常！')
                return True
            else:
                print(f'❌ Toast 内容不匹配')
                print(f'   期望: "请先申请加入"')
                print(f'   实际: "{toast_result["text"]}"')
                print('\n❌ 测试失败：Toast 内容不符合预期')
                return False
        else:
            print('❌ 未能获取到 Toast')
            
            # 打印所有获取到的 modals 用于调试
            print('\n🔍 调试信息：尝试获取所有 modals')
            try:
                all_modals = mini.app.get_modals(since=before_like_time)
                print(f'   共获取到 {len(all_modals)} 个 modals:')
                for i, modal in enumerate(all_modals):
                    print(f'   [{i+1}] type: {modal.get("type")}, title: {modal.get("title", "N/A")}')
            except Exception as e:
                print(f'   获取 modals 失败: {str(e)}')
            
            print('\n❌ 测试失败：未检测到 Toast')
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
    success = test_toast_on_unauthorized_like()
    sys.exit(0 if success else 1)

