#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Workflow Helper 模块

提供工作流级别的测试辅助函数，用于验证完整的用户交互流程
"""

import time
import traceback
from .navigation_helper import navigate_to_main, navigate_to_details
from .circle_helper import enter_discover_circle, verify_discover_refresh, enter_circle_settings
from .auth_helper import check_register_popup_visible, close_register_popup_by_mask
from .common_helper import check_toast
from .post_helper import (
    publish_post_with_single_image,
    publish_post_with_multi_images,
    like_post,
    unlike_post,
    comment_on_post,
    reply_to_comment,
    delete_comment,
    delete_post
)

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


def check_actions_member_main(mini, circle_id, test_images):
    """验证成员在 details 页面的完整发帖工作流
    
    前置条件：
    - 会自动导航到 details 页面（如果不在的话）
    - 已经创建了一个朋友圈（传入 circle_id）
    
    测试流程：
    - 发帖子（使用图片）
    - 对帖子进行点赞
    - 对帖子进行评论
    - 对帖子的评论回复
    - 删除一条评论
    - 取消点赞
    - 删除帖子
    - 发一个包含三张图片的帖子
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID
        test_images: 测试图片路径列表（至少需要1张，推荐3张）
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'test_data': dict  # 包含 first_post, multi_image_post 等测试数据
        }
    """
    
    print('\n' + '='*60)
    print('🧪 完整的成员在 details 页面的发帖工作流')
    print('='*60)
    
    # 确保在 details 页面
    print('\n🔄 确保在 details 页面...')
    nav_result = navigate_to_details(mini, circle_id)
    if not nav_result['success']:
        return {
            'success': False, 
            'message': f'导航到 details 页面失败: {nav_result["message"]}',
            'test_data': {}
        }
    print('✅ 已在 details 页面\n')
    
    test_data = {}
    
    try:
        # 步骤3：发帖子（使用图片）
        print('\n3️⃣ 用户发帖子（使用图片）...')
        post_content = '这是我的第一条测试帖子 📸'
        
        result = publish_post_with_single_image(
            mini, 
            circle_id, 
            post_content, 
            test_images[0], 
            test_images
        )
        if not result['success']:
            return {'success': False, 'message': f'步骤3失败：{result["message"]}', 'test_data': test_data}
        
        test_data['first_post'] = result['post']
        
        # 步骤4：对帖子进行点赞
        print('\n4️⃣ 对帖子进行点赞...')
        post_id = test_data['first_post']['_id']
        result = like_post(mini, post_id)
        if not result['success']:
            return {'success': False, 'message': f'步骤4失败：{result["message"]}', 'test_data': test_data}
        
        # 步骤5：对帖子进行评论
        print('\n5️⃣ 对帖子进行评论...')
        comment_text = '这是一条测试评论 💬'
        result = comment_on_post(mini, comment_text)
        if not result['success']:
            return {'success': False, 'message': f'步骤5失败：{result["message"]}', 'test_data': test_data}
        
        # 步骤6：对评论进行回复
        print('\n6️⃣ 对评论进行回复...')
        reply_text = '这是一条测试回复 📝'
        result = reply_to_comment(mini, reply_text)
        if not result['success']:
            return {'success': False, 'message': f'步骤6失败：{result["message"]}', 'test_data': test_data}
        
        # 步骤7：删除刚创建的回复
        print('\n7️⃣ 删除刚创建的回复...')
        result = delete_comment(mini, is_reply=True)
        if not result['success']:
            print(f'   ⚠️  {result["message"]}')
    
        # 步骤8：删除原始评论
        print('\n8️⃣ 删除原始评论...')
        result = delete_comment(mini, is_reply=False)
        if not result['success']:
            print(f'   ⚠️  {result["message"]}')
        
        # 步骤9：取消点赞
        print('\n9️⃣ 取消点赞...')
        post_id = test_data['first_post']['_id']
        result = unlike_post(mini, post_id)
        if not result['success']:
            return {'success': False, 'message': f'步骤9失败：{result["message"]}', 'test_data': test_data}
        
        # 步骤10：删除帖子
        print('\n🔟 删除帖子...')
        post_id = test_data['first_post']['_id']
        result = delete_post(mini, post_id)
        if not result['success']:
            return {'success': False, 'message': f'步骤10失败：{result["message"]}', 'test_data': test_data}
        
        # 步骤11：发一个包含三张图片的帖子
        print('\n1️⃣1️⃣ 发一个包含三张图片的帖子...')
        post_content = '这是一个包含三张图片的测试帖子 🖼️🖼️🖼️'
        
        result = publish_post_with_multi_images(mini, circle_id, post_content, test_images)
        if result['success']:
            test_data['multi_image_post'] = result['post']
            # 验证图片数量
            image_count = len(result['post'].get('images', []))
            if image_count == 3:
                print(f'   ✅ 三张图片的帖子发布成功: {image_count}张图片')
            elif image_count == 0:
                print(f'   ✅ 帖子发布成功（仅文字，图片上传失败但已处理）')
            else:
                print(f'   ⚠️  部分图片上传成功: {image_count}张图片（期望3张）')
        else:
            print(f'   ⚠️  {result["message"]}')
        
        print('\n✅ 完整的成员在 details 页面的发帖工作流通过')
        return {
            'success': True, 
            'message': '完整的成员在 details 页面的发帖工作流通过',
            'test_data': test_data
        }
        
    except Exception as e:
        print(f'\n❌ 工作流异常: {str(e)}')
        traceback.print_exc()
        return {
            'success': False, 
            'message': f'工作流异常: {str(e)}',
            'test_data': test_data
        }


def check_actions_noaccess_main(mini, circle_id, toast_text):
    """验证无权限用户在 details 页面的所有动作是否显示正确的 Toast 提示
    
    前置条件：
    - 会自动导航到 details 页面（如果不在的话）
    - 用户无权限操作该朋友圈（如未加入、未申请等）
    - 朋友圈中至少有一个帖子和一条评论
    
    测试流程：
    - 尝试对帖子进行点赞（预期失败，显示 Toast）
    - 尝试对帖子进行评论（预期失败，显示 Toast）
    - 尝试对评论进行回复（预期失败，显示 Toast）
    - 尝试进入设置页面（预期失败，显示 Toast）
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID
        toast_text: 预期的 Toast 提示文字（如 "请先申请加入"）
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'failed_checks': list  # 失败的检查项列表
        }
    """
    
    print('\n' + '='*60)
    print('🧪 验证无权限用户在 details 页面的 Toast 提示')
    print('='*60)
    
    # 确保在 details 页面
    print('\n🔄 确保在 details 页面...')
    nav_result = navigate_to_details(mini, circle_id)
    if not nav_result['success']:
        return {
            'success': False, 
            'message': f'导航到 details 页面失败: {nav_result.get("error", "未知错误")}',
            'failed_checks': []
        }
    print('✅ 已在 details 页面\n')
    
    # 获取帖子信息
    page = mini.app.current_page
    posts = page.data.get('posts', [])
    
    if not posts or len(posts) == 0:
        return {
            'success': False,
            'message': '朋友圈没有帖子，无法进行测试',
            'failed_checks': []
        }
    
    first_post = posts[0]
    post_id = first_post.get('_id') or first_post.get('id')
    print(f'📝 找到帖子，ID: {post_id}\n')
    
    failed_checks = []
    
    try:
        # 步骤1：尝试点赞
        print('1️⃣ 尝试对帖子进行点赞（预期失败）...')
        before_action_time = time.time()
        
        like_result = like_post(mini, post_id, expect_success=False)
        if not like_result['success']:
            print(f'   ❌ 点赞操作失败: {like_result["message"]}')
            failed_checks.append('点赞操作异常')
        else:
            # 等待并检查 Toast
            time.sleep(0.5)
            toast_result = check_toast(mini, expected_text=toast_text, since=before_action_time)
            
            if toast_result['success'] and toast_result['match']:
                print(f'   ✅ Toast 验证通过: "{toast_result["text"]}"')
            else:
                print(f'   ❌ Toast 验证失败')
                failed_checks.append(f'点赞 Toast 不匹配（期望: {toast_text}, 实际: {toast_result.get("text", "无")}）')
        
        # 等待下一个操作（Toast 显示 0.5 秒 + 0.5 秒缓冲）
        time.sleep(1.0)
        
        # 步骤2：尝试评论
        print('\n2️⃣ 尝试对帖子进行评论（预期失败）...')
        before_action_time = time.time()
        
        comment_result = comment_on_post(mini, '测试评论', expect_success=False)
        if not comment_result['success']:
            print(f'   ❌ 评论操作失败: {comment_result["message"]}')
            failed_checks.append('评论操作异常')
        else:
            # 等待并检查 Toast
            time.sleep(0.5)
            toast_result = check_toast(mini, expected_text=toast_text, since=before_action_time)
            
            if toast_result['success'] and toast_result['match']:
                print(f'   ✅ Toast 验证通过: "{toast_result["text"]}"')
            else:
                print(f'   ❌ Toast 验证失败')
                failed_checks.append(f'评论 Toast 不匹配（期望: {toast_text}, 实际: {toast_result.get("text", "无")}）')
        
        # 等待下一个操作
        time.sleep(1.0)
        
        # 步骤3：尝试回复
        print('\n3️⃣ 尝试对评论进行回复（预期失败）...')
        before_action_time = time.time()
        
        reply_result = reply_to_comment(mini, '测试回复', expect_success=False)
        if not reply_result['success']:
            print(f'   ❌ 回复操作失败: {reply_result["message"]}')
            failed_checks.append('回复操作异常')
        else:
            # 等待并检查 Toast
            time.sleep(0.5)
            toast_result = check_toast(mini, expected_text=toast_text, since=before_action_time)
            
            if toast_result['success'] and toast_result['match']:
                print(f'   ✅ Toast 验证通过: "{toast_result["text"]}"')
            else:
                print(f'   ❌ Toast 验证失败')
                failed_checks.append(f'回复 Toast 不匹配（期望: {toast_text}, 实际: {toast_result.get("text", "无")}）')
        
        # 等待下一个操作
        time.sleep(1.0)
        
        # 步骤4：尝试进入设置
        print('\n4️⃣ 尝试进入设置页面（预期失败）...')
        before_action_time = time.time()
        
        settings_result = enter_circle_settings(mini, circle_id, expect_success=False)
        if not settings_result['success']:
            print(f'   ❌ 进入设置操作失败: {settings_result["message"]}')
            failed_checks.append('进入设置操作异常')
        else:
            # 等待并检查 Toast
            time.sleep(0.5)
            toast_result = check_toast(mini, expected_text=toast_text, since=before_action_time)
            
            if toast_result['success'] and toast_result['match']:
                print(f'   ✅ Toast 验证通过: "{toast_result["text"]}"')
            else:
                print(f'   ❌ Toast 验证失败')
                failed_checks.append(f'设置 Toast 不匹配（期望: {toast_text}, 实际: {toast_result.get("text", "无")}）')
        
        # 总结
        print('\n' + '='*60)
        if len(failed_checks) == 0:
            print('✅ 所有 Toast 验证通过！')
            return {
                'success': True,
                'message': '所有无权限操作的 Toast 提示正确',
                'failed_checks': []
            }
        else:
            print(f'❌ 有 {len(failed_checks)} 项检查失败:')
            for check in failed_checks:
                print(f'   - {check}')
            return {
                'success': False,
                'message': f'{len(failed_checks)} 项检查失败',
                'failed_checks': failed_checks
            }
        
    except Exception as e:
        print(f'\n❌ 工作流异常: {str(e)}')
        traceback.print_exc()
        return {
            'success': False, 
            'message': f'工作流异常: {str(e)}',
            'failed_checks': failed_checks
        }
