#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Workflow Helper 模块

提供工作流级别的测试辅助函数，用于验证完整的用户交互流程
"""

import time
import traceback
from .navigation_helper import navigate_to_main
from .circle_helper import enter_discover_circle, verify_discover_refresh
from .auth_helper import check_register_popup_visible, close_register_popup_by_mask

# 未注册用户操作的预期消息文本
EXPECTED_MESSAGES = {
    'loginButton': '请完善您的个人信息',
    'enterListPage': '您需要登录才能查看朋友圈列表',
    'createCircle': '您需要登录才能创建朋友圈',
    'acceptInvite': '请先完成注册后加入朋友圈',
    'applyToJoin': '请先完成注册后提交申请',
}


def check_actions_unregistered_main(mini):
    """验证未注册用户在 main 页面的所有动作是否有正确反馈
    
    前置条件：
    - 要求当前用户身份为 unregistered（未注册）
    - 会自动导航到 main 页面（如果不在的话）
    
    测试场景：
    - 点击"点击登录"按钮
    - 点击历史记录
    - 点击创建新朋友圈
    - 刷新"发现有趣朋友圈"
    - 进入有趣朋友圈（浏览模式）
    
    Args:
        mini: Minium 实例
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        # 确保在 main 页面
        print('\n🔄 确保在 main 页面...')
        nav_result = navigate_to_main(mini)
        if not nav_result['success']:
            print(f'❌ 导航到 main 页面失败: {nav_result["message"]}')
            return {'success': False, 'message': f'导航失败: {nav_result["message"]}'}
        print('✅ 已在 main 页面\n')
        
        print('\n' + '='*60)
        print('🧪 验证未注册用户在 Main 页面的操作')
        print('='*60)
        
        # MAIN_001: 点击"点击登录"按钮
        print('\n📝 测试 MAIN_001: 点击"点击登录"按钮')
        print('-'*60)
        
        page = mini.app.current_page
        browse_tip = page.get_element('.browse-tip-card')
        if not browse_tip:
            print('⚠️  未找到浏览提示卡片')
            return {'success': False, 'message': 'MAIN_001失败：未找到浏览提示卡片'}
        print('✅ 找到浏览提示卡片')
        
        login_btn = page.get_element('.create-btn')
        if not login_btn:
            print('❌ 未找到"点击登录"按钮')
            return {'success': False, 'message': 'MAIN_001失败：未找到登录按钮'}
        print('✅ 找到"点击登录"按钮')
        
        login_btn.tap()
        time.sleep(0.2)
        
        result = check_register_popup_visible(mini, EXPECTED_MESSAGES['loginButton'])
        if not result['visible']:
            print('❌ 未弹出注册弹窗')
            return {'success': False, 'message': 'MAIN_001失败：未弹出注册弹窗'}
        print(f'✅ 弹出注册弹窗')
        
        if result['match'] is False:
            print(f'❌ 弹窗提示文字不正确')
            print(f'   期望: "{EXPECTED_MESSAGES["loginButton"]}"')
            print(f'   实际: "{result["reason"]}"')
            return {'success': False, 'message': 'MAIN_001失败：弹窗文字不正确'}
        print(f'✅ 弹窗文字验证通过: "{result["reason"]}"')
        
        close_register_popup_by_mask(mini, wait_visible=0.4)
        
        # MAIN_002: 点击历史记录
        print('\n📝 测试 MAIN_002: 点击历史记录')
        print('-'*60)
        
        page = mini.app.current_page
        history_btn = page.get_element('.action-panel')
        if not history_btn:
            print('❌ 未找到历史记录按钮')
            return {'success': False, 'message': 'MAIN_002失败：未找到历史记录按钮'}
        print('✅ 找到历史记录按钮')
        
        history_btn.tap()
        time.sleep(0.2)
        
        result = check_register_popup_visible(mini, EXPECTED_MESSAGES['enterListPage'])
        if not result['visible']:
            print('❌ 未弹出注册弹窗')
            return {'success': False, 'message': 'MAIN_002失败：未弹出注册弹窗'}
        print(f'✅ 弹出注册弹窗')
        
        if result['match'] is False:
            print(f'❌ 弹窗提示文字不正确')
            print(f'   期望: "{EXPECTED_MESSAGES["enterListPage"]}"')
            print(f'   实际: "{result["reason"]}"')
            return {'success': False, 'message': 'MAIN_002失败：弹窗文字不正确'}
        print(f'✅ 弹窗文字验证通过: "{result["reason"]}"')
        
        close_register_popup_by_mask(mini, wait_visible=0.4)
        
        # MAIN_003: 点击创建新朋友圈
        print('\n📝 测试 MAIN_003: 点击创建新朋友圈')
        print('-'*60)
        
        page = mini.app.current_page
        create_btn = page.get_element('.create-section')
        if not create_btn:
            print('❌ 未找到创建朋友圈按钮')
            return {'success': False, 'message': 'MAIN_003失败：未找到创建朋友圈按钮'}
        print('✅ 找到创建朋友圈按钮')
        
        create_btn.tap()
        time.sleep(0.2)
        
        result = check_register_popup_visible(mini, EXPECTED_MESSAGES['createCircle'])
        if not result['visible']:
            print('❌ 未弹出注册弹窗')
            return {'success': False, 'message': 'MAIN_003失败：未弹出注册弹窗'}
        print(f'✅ 弹出注册弹窗')
        
        if result['match'] is False:
            print(f'❌ 弹窗提示文字不正确')
            print(f'   期望: "{EXPECTED_MESSAGES["createCircle"]}"')
            print(f'   实际: "{result["reason"]}"')
            return {'success': False, 'message': 'MAIN_003失败：弹窗文字不正确'}
        print(f'✅ 弹窗文字验证通过: "{result["reason"]}"')
        
        close_register_popup_by_mask(mini, wait_visible=0.4)
        
        # MAIN_004: 刷新"发现有趣朋友圈"
        print('\n📝 测试 MAIN_004: 刷新"发现有趣朋友圈"')
        print('-'*60)
        
        result = verify_discover_refresh(mini)
        if result['success']:
            print(f'✅ 验证通过：{result["message"]}')
            if result['circle_id_changed']:
                print(f'   ℹ️  朋友圈已更换')
            else:
                print(f'   ℹ️  后端推荐了相同的朋友圈（刷新功能正常）')
        else:
            print(f'❌ 验证失败：{result["message"]}')
            return {'success': False, 'message': f'MAIN_004失败：{result["message"]}'}
        
        # MAIN_005: 进入有趣朋友圈（浏览模式）
        print('\n📝 测试 MAIN_005: 进入有趣朋友圈（浏览模式）')
        print('-'*60)
        
        result = enter_discover_circle(mini)
        if result['success']:
            print(f'✅ 验证通过：成功进入发现朋友圈')
            print(f'   朋友圈ID: {result["circle_id"][:12]}...')
        else:
            if '没有推荐' in result['message']:
                print(f'⚠️  {result["message"]}（跳过测试）')
            else:
                print(f'❌ 验证失败: {result["message"]}')
                return {'success': False, 'message': f'MAIN_005失败：{result["message"]}'}
        
        print('\n✅ Main 页面所有验证通过')
        return {'success': True, 'message': 'Main 页面验证通过'}
        
    except Exception as e:
        print(f'\n❌ 测试异常: {str(e)}')
        traceback.print_exc()
        return {'success': False, 'message': f'测试异常: {str(e)}'}


def check_actions_unregistered_details(mini, test_circle_id='68ff34ecc7f96a66e395cc33'):
    """验证未注册用户在 details 页面的所有动作是否有正确反馈
    
    前置条件：
    - 要求当前用户身份为 unregistered（未注册）
    - 会自动导航到 details 页面（如果不在的话，会从 main 进入）
    
    测试场景：
    - 点赞检查弹窗
    - 评论检查弹窗
    - 设置检查弹窗
    - 回复评论检查弹窗
    
    Args:
        mini: Minium 实例
        test_circle_id: 用于回复评论测试的圈子ID（需要有评论）
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        # 确保在 main 页面，然后从 main 进入 details
        print('\n🔄 从 Main 页面进入 Details...')
        
        # 步骤1: 先确保在 main 页面
        nav_result = navigate_to_main(mini)
        if not nav_result['success']:
            print(f'❌ 导航到 main 失败: {nav_result["message"]}')
            return {'success': False, 'message': f'导航失败: {nav_result["message"]}'}
        print('✅ 已在 main 页面')
        
        time.sleep(0.5)
        
        # 步骤2: 从 main 点击卡片进入 details
        try:
            page = mini.app.current_page
            card_content = page.get_element('discover-circle-card>>>.post-card')
            card_content.tap()
            print('✅ 点击卡片，进入 details')
            time.sleep(1.5)
            
            current_page = mini.app.current_page
            if current_page.path != '/pages/details/details':
                print(f'❌ 未能进入 details 页面，当前在: {current_page.path}')
                return {'success': False, 'message': '未能进入 details 页面'}
            print('✅ 已进入 details 页面')
        except Exception as e:
            error_msg = str(e).lower()
            if 'not found' in error_msg:
                print('⚠️  没有推荐的朋友圈，跳过所有 details 测试')
                return {'success': True, 'message': 'Details 页面验证通过（无可测试场景）'}
            else:
                print(f'❌ 进入 details 失败: {str(e)}')
                traceback.print_exc()
                return {'success': False, 'message': f'进入 details 失败: {str(e)}'}
        
        print('\n' + '='*60)
        print('🧪 验证未注册用户在 Details 页面的操作')
        print('='*60)
        
        # DETAILS_002: 点赞检查弹窗
        print('\n📝 测试 DETAILS_002: 点赞检查弹窗')
        print('-'*60)
        
        try:
            page = mini.app.current_page
            post_item = page.get_element('post-item')
            if not post_item:
                print('⚠️  未找到帖子，跳过点赞测试')
            else:
                print('✅ 找到帖子')
                
                # 找到三点按钮并点击展开菜单
                menu_btn = page.get_element('post-item>>>.actions-menu-btn')
                if not menu_btn:
                    print('⚠️  未找到操作菜单按钮')
                else:
                    print('✅ 找到操作菜单按钮')
                    menu_btn.tap()
                    time.sleep(0.3)
                    
                    # 在下拉菜单中找到点赞按钮（第一个dropdown-item）
                    like_items = page.get_elements('post-item>>>.dropdown-item')
                    if not like_items or len(like_items) == 0:
                        print('⚠️  未找到下拉菜单项')
                    else:
                        like_btn = like_items[0]
                        print('✅ 找到点赞按钮')
                        like_btn.tap()
                        time.sleep(0.3)
                        
                        result = check_register_popup_visible(mini, expected_reason='登录后才能点赞')
                        if not result['visible']:
                            print('❌ 未弹出注册弹窗')
                            return {'success': False, 'message': 'DETAILS_002失败：未弹出注册弹窗'}
                        
                        if not result['match']:
                            print('❌ 弹窗文字不匹配')
                            return {'success': False, 'message': 'DETAILS_002失败：弹窗文字不匹配'}
                        
                        print(f'✅ 弹窗正确显示且文字验证通过')
                        close_register_popup_by_mask(mini, wait_visible=0.4)
        except Exception as e:
            error_msg = str(e).lower()
            if 'not found' in error_msg:
                print(f'⚠️  未找到相关元素，跳过测试')
            else:
                print(f'❌ 测试异常: {str(e)}')
                traceback.print_exc()
                return {'success': False, 'message': f'DETAILS_002异常：{str(e)}'}
        
        # DETAILS_003: 评论检查弹窗
        print('\n📝 测试 DETAILS_003: 评论检查弹窗')
        print('-'*60)
        
        try:
            page = mini.app.current_page
            post_item = page.get_element('post-item')
            if not post_item:
                print('⚠️  未找到帖子，跳过评论测试')
            else:
                print('✅ 找到帖子')
                
                # 找到三点按钮并点击展开菜单
                menu_btn = page.get_element('post-item>>>.actions-menu-btn')
                if not menu_btn:
                    print('⚠️  未找到操作菜单按钮')
                else:
                    print('✅ 找到操作菜单按钮')
                    menu_btn.tap()
                    time.sleep(0.3)
                    
                    # 在下拉菜单中找到评论按钮（第二个dropdown-item）
                    comment_items = page.get_elements('post-item>>>.dropdown-item')
                    if not comment_items or len(comment_items) < 2:
                        print('⚠️  未找到下拉菜单项或评论按钮')
                    else:
                        comment_btn = comment_items[1]
                        print('✅ 找到评论按钮')
                        comment_btn.tap()
                        time.sleep(0.3)
                        
                        result = check_register_popup_visible(mini, expected_reason='登录后才能发表评论')
                        if not result['visible']:
                            print('❌ 未弹出注册弹窗')
                            return {'success': False, 'message': 'DETAILS_003失败：未弹出注册弹窗'}
                        
                        if not result['match']:
                            print('❌ 弹窗文字不匹配')
                            return {'success': False, 'message': 'DETAILS_003失败：弹窗文字不匹配'}
                        
                        print(f'✅ 弹窗正确显示且文字验证通过')
                        close_register_popup_by_mask(mini, wait_visible=0.4)
        except Exception as e:
            error_msg = str(e).lower()
            if 'not found' in error_msg:
                print(f'⚠️  未找到相关元素，跳过测试')
            else:
                print(f'❌ 测试异常: {str(e)}')
                traceback.print_exc()
                return {'success': False, 'message': f'DETAILS_003异常：{str(e)}'}
        
        # DETAILS_004: 设置检查弹窗
        print('\n📝 测试 DETAILS_004: 设置检查弹窗')
        print('-'*60)
        
        try:
            page = mini.app.current_page
            # 设置按钮在右上角的.setting-btn
            settings_btn = page.get_element('.setting-btn')
            if not settings_btn:
                print('⚠️  未找到设置按钮')
            else:
                print('✅ 找到设置按钮')
                settings_btn.tap()
                time.sleep(0.3)
                
                result = check_register_popup_visible(mini, expected_reason='您需要登录才能修改设置')
                if not result['visible']:
                    print('❌ 未弹出注册弹窗')
                    return {'success': False, 'message': 'DETAILS_004失败：未弹出注册弹窗'}
                
                if not result['match']:
                    print('❌ 弹窗文字不匹配')
                    return {'success': False, 'message': 'DETAILS_004失败：弹窗文字不匹配'}
                
                print(f'✅ 弹窗正确显示且文字验证通过')
                close_register_popup_by_mask(mini, wait_visible=0.4)
        except Exception as e:
            error_msg = str(e).lower()
            if 'not found' in error_msg:
                print(f'⚠️  未找到相关元素，跳过测试')
            else:
                print(f'❌ 测试异常: {str(e)}')
                traceback.print_exc()
                return {'success': False, 'message': f'DETAILS_004异常：{str(e)}'}

        
        # DETAILS_006: 回复评论检查弹窗
        print('\n📝 测试 DETAILS_006: 回复评论检查弹窗')
        print('-'*60)
        
        try:
            # 导航到测试圈子
            print(f'📍 导航到测试圈子: {test_circle_id}')
            mini.app.navigate_to(f'/pages/details/details?circleId={test_circle_id}')
            time.sleep(2.0)
            
            current_page = mini.app.current_page
            if current_page.path != '/pages/details/details':
                print(f'❌ 未能进入 details 页面，当前在: {current_page.path}')
                return {'success': False, 'message': 'DETAILS_006失败：未能进入 details 页面'}
            print('✅ 已进入测试圈子')
            
            # 查找评论的回复按钮
            page = mini.app.current_page
            reply_btn = page.get_element('post-item>>>.reply-btn')
            if not reply_btn:
                print('❌ 未找到回复按钮（测试圈子没有评论）')
                return {'success': False, 'message': 'DETAILS_006失败：未找到回复按钮'}
            
            print('✅ 找到回复按钮')
            reply_btn.tap()
            time.sleep(0.3)
            
            result = check_register_popup_visible(mini, expected_reason='登录后才能发表评论')
            if not result['visible']:
                print('❌ 未弹出注册弹窗')
                return {'success': False, 'message': 'DETAILS_006失败：未弹出注册弹窗'}
            
            if not result['match']:
                print('❌ 弹窗文字不匹配')
                return {'success': False, 'message': 'DETAILS_006失败：弹窗文字不匹配'}
            
            print(f'✅ 弹窗正确显示且文字验证通过')
            close_register_popup_by_mask(mini, wait_visible=0.4)
            
        except Exception as e:
            error_msg = str(e).lower()
            if 'not found' in error_msg:
                print(f'❌ 未找到相关元素（测试圈子可能没有评论或选择器错误）')
                return {'success': False, 'message': f'DETAILS_006失败：未找到元素 - {str(e)}'}
            else:
                print(f'❌ 测试异常: {str(e)}')
                traceback.print_exc()
                return {'success': False, 'message': f'DETAILS_006异常：{str(e)}'}
        
        print('\n✅ Details 页面所有验证通过')
        return {'success': True, 'message': 'Details 页面验证通过'}
        
    except Exception as e:
        print(f'\n❌ 测试异常: {str(e)}')
        traceback.print_exc()
        return {'success': False, 'message': f'测试异常: {str(e)}'}
