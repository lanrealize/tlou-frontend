#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分享场景测试辅助工具
用途：测试应用的核心分享功能
"""

import time


def navigate_to_details_from_share(mini, circle_id=None, inviter_id=None):
    """模拟从分享链接进入 details 页面（邀请模式）
    
    这是应用的核心功能场景：用户通过分享链接被邀请进入朋友圈
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID（可选，None=自动从推荐获取）
        inviter_id: 邀请人ID（可选，None=自动从推荐获取）
        
    Returns:
        dict: {
            'success': bool,
            'circle_id': str,
            'inviter_id': str,
            'url': str,
            'error': str (如果失败)
        }
    """
    try:
        # 如果没有提供参数，从 main 页面的推荐圈子获取
        if not circle_id or not inviter_id:
            current_path = mini.app.current_page.path
            if 'main' not in current_path:
                mini.app.navigate_to('/pages/main/main')
                time.sleep(0.5)
            
            page = mini.app.current_page
            circles = page.data.get('recommendedCircles', [])
            
            if not circles or len(circles) == 0:
                return {
                    'success': False,
                    'circle_id': '',
                    'inviter_id': '',
                    'url': '',
                    'error': '没有推荐圈子数据，无法获取分享链接'
                }
            
            circle = circles[0]
            circle_id = circle.get('_id', '')
            creator = circle.get('creator', {})
            inviter_id = creator.get('_id', '') if isinstance(creator, dict) else creator
        
        # 构造分享URL（邀请模式）
        share_url = f'/pages/details/details?circleId={circle_id}&type=invite&inviterId={inviter_id}'
        print(f'📤 模拟分享链接进入: {share_url}')
        
        # 导航到 details 页面
        mini.app.navigate_to(share_url)
        time.sleep(1.5)
        
        print('✅ 已从分享链接进入 details 页面')
        return {
            'success': True,
            'circle_id': circle_id,
            'inviter_id': inviter_id,
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
            'inviter_id': '',
            'url': '',
            'error': str(e)
        }

