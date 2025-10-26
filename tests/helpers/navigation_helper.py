#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
页面导航辅助工具 - 页面跳转和导航逻辑
"""

import time


# ============================================
# 页面导航
# ============================================

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
        
        print('✅ 已进入 details 页面')
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


def navigate_to_details_from_share(mini, circle_id=None, inviter_id=None):
    """
    模拟从分享链接进入 details 页面（邀请模式）
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID（如果为None，从main页面第一个推荐圈子获取）
        inviter_id: 邀请人ID（如果为None，从推荐圈子的creator获取）
        
    Returns:
        dict: {
            'success': bool,
            'circle_id': str,
            'inviter_id': str,
            'url': str
        }
    """
    try:
        # 如果没有提供 circle_id，从 main 页面获取
        if not circle_id or not inviter_id:
            # 先确保在 main 页面
            current_path = mini.app.current_page.path
            if 'main' not in current_path:
                mini.app.navigate_to('/pages/main/main')
                time.sleep(0.5)
            
            page = mini.app.current_page
            circles = page.data.get('recommendedCircles', [])
            
            if not circles or len(circles) == 0:
                print('❌ 没有推荐圈子数据，无法获取分享链接')
                return {
                    'success': False,
                    'circle_id': '',
                    'inviter_id': '',
                    'url': ''
                }
            
            circle = circles[0]
            circle_id = circle.get('_id', '')
            creator = circle.get('creator', {})
            inviter_id = creator.get('_id', '') if isinstance(creator, dict) else creator
        
        # 构造分享URL（邀请模式）
        share_url = f'/pages/details/details?circleId={circle_id}&type=invite&inviterId={inviter_id}'
        print(f'📤 模拟分享链接: {share_url}')
        
        # 导航到 details 页面
        mini.app.navigate_to(share_url)
        time.sleep(1.5)
        
        print('✅ 已从分享链接进入 details 页面')
        return {
            'success': True,
            'circle_id': circle_id,
            'inviter_id': inviter_id,
            'url': share_url
        }
        
    except Exception as e:
        print(f'❌ 从分享进入 details 失败: {str(e)}')
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'circle_id': '',
            'inviter_id': '',
            'url': ''
        }

