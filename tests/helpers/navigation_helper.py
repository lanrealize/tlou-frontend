#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
页面导航测试辅助工具
用途：提供各种页面导航场景的辅助函数，包括普通导航和分享链接导航
"""

import time
from .common_helper import evaluate_js


def navigate_to_details_from_share(mini, circle_id, invite_code):
    """模拟从分享链接进入 details 页面
    
    真实场景：用户点击分享链接进入朋友圈
    - 所有分享链接都带 inviteCode（不论公开/私有）
    - 前端总是传递 inviteCode 给后端
    - 后端根据朋友圈类型决定是否验证
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID（必选）
        invite_code: 邀请码（必选，从 create_circle/verify_create_circle 获取）
        
    Returns:
        dict: {
            'success': bool,
            'circle_id': str,
            'invite_code': str,
            'url': str,
            'error': str (如果失败)
        }
    """
    try:
        # 参数验证
        if not circle_id:
            raise ValueError('circle_id 是必选参数')
        if invite_code is None:
            raise ValueError('invite_code 是必选参数，请从 create_circle() 返回值中获取')
        
        print(f'📤 模拟分享链接进入: circleId={circle_id[:8]}..., inviteCode={invite_code or "(empty)"}')
        
        # 构造分享 URL（总是带 inviteCode）
        share_url = f'/pages/details/details?circleId={circle_id}&inviteCode={invite_code}'
        
        print(f'   完整链接: {share_url}')
        
        # 导航到 details 页面
        mini.app.navigate_to(share_url)
        time.sleep(1.5)
        
        print('✅ 已从分享链接进入 details 页面')
        return {
            'success': True,
            'circle_id': circle_id,
            'invite_code': invite_code,
            'url': share_url,
            'error': ''
        }
        
    except Exception as e:
        print(f'❌ 从分享进入 details 失败: {str(e)}')
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'circle_id': '',
            'invite_code': '',
            'url': '',
            'error': str(e)
        }


def navigate_to_details(mini, circle_id, source='discover'):
    """
    导航到 details 页面（普通模式）
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID（必需）
        source: 来源标识（可选，默认'discover'）
        
    Returns:
        dict: {
            'success': bool,
            'circle_id': str,
            'url': str,
            'error': str
        }
    """
    try:
        # 构造URL
        if source:
            url = f'/pages/details/details?circleId={circle_id}&source={source}'
        else:
            url = f'/pages/details/details?circleId={circle_id}'
        
        print(f'🔗 导航到 details: {url}')
        
        # 导航
        mini.app.navigate_to(url)
        time.sleep(1.5)
        
        # 检查是否有错误对话框（404等错误）
        try:
            js_check_error = """
            function checkErrorModal() {
                const pages = getCurrentPages();
                const page = pages[pages.length - 1];
                
                // 检查circle数据是否加载成功
                if (!page.data.circle || !page.data.circle._id) {
                    return { hasError: true, reason: 'circle_data_missing' };
                }
                
                return { hasError: false };
            }
            """
            result = mini.app.evaluate(js_check_error.strip(), sync=True)
            check_result = result.get('result', {}).get('result', {})
            
            if check_result.get('hasError'):
                error_reason = check_result.get('reason', 'unknown')
                print(f'❌ Details页面加载失败: {error_reason}')
                return {
                    'success': False,
                    'circle_id': circle_id,
                    'url': url,
                    'error': f'页面加载失败: {error_reason}'
                }
        except Exception as check_error:
            print(f'⚠️  检查页面状态时出错: {str(check_error)}')
        
        print(f'✅ 已进入 details 页面，circle_id: {circle_id}')
        return {
            'success': True,
            'circle_id': circle_id,
            'url': url,
            'error': ''
        }
        
    except Exception as e:
        print(f'❌ 导航到 details 失败: {str(e)}')
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'circle_id': '',
            'url': '',
            'error': str(e)
        }


def navigate_to_main(mini, use_relaunch=False):
    """导航到 main 页面
    
    Args:
        mini: Minium 实例
        use_relaunch: 是否使用 reLaunch（清空页面栈），默认 False
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        # 检查是否已经在 main 页面
        current_page = mini.app.current_page
        if 'main' in current_page.path:
            print('✅ 已在 main 页面，无需导航')
            return {
                'success': True,
                'message': '已在 main 页面'
            }
        
        # 需要导航到 main 页面
        if use_relaunch:
            print('🏠 导航到 main 页面（清空页面栈）...')
            mini.app.relaunch('/pages/main/main')
        else:
            print('🏠 导航到 main 页面...')
            mini.app.navigate_to('/pages/main/main')
        
        time.sleep(1.0)
        
        page = mini.app.current_page
        if 'main' not in page.path:
            return {
                'success': False,
                'message': f'导航失败，当前在: {page.path}'
            }
        
        if use_relaunch:
            print('✅ 已进入 main 页面（页面栈已清空）')
        else:
            print('✅ 已进入 main 页面')
        
        return {
            'success': True,
            'message': '导航成功'
        }
        
    except Exception as e:
        print(f'❌ 导航到 main 失败: {str(e)}')
        return {
            'success': False,
            'message': str(e)
        }


def navigate_to_list(mini):
    """导航到朋友圈列表页面
    
    Args:
        mini: Minium 实例
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'page_title': str
        }
    """
    try:
        print('📋 导航到朋友圈列表页面...')
        
        # 导航
        mini.app.navigate_to('/pages/list/list')
        time.sleep(0.3)
        
        # 验证是否成功进入 list 页面
        page = mini.app.current_page
        if 'list' not in page.path:
            return {
                'success': False,
                'message': f'导航失败，当前在: {page.path}',
                'page_title': ''
            }
        
        # 获取页面标题
        page_title = page.data.get('pageTitle', '')
        
        print(f'✅ 已进入 list 页面: {page_title}')
        
        return {
            'success': True,
            'message': '导航成功',
            'page_title': page_title
        }
        
    except Exception as e:
        print(f'❌ 导航到 list 失败: {str(e)}')
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': str(e),
            'page_title': ''
        }