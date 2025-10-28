#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Element Helper - 通用元素交互操作
存放与具体业务无关的、纯粹的元素交互操作
"""


def click_create_circle_button(mini):
    """点击创建朋友圈按钮
    
    适用场景：
    - 未登录用户点击创建，会触发登录弹窗
    - 需要在点击后执行其他操作（如登录）
    
    Args:
        mini: Minium 实例
    
    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        page = mini.app.current_page
        create_btn = page.get_element('#createCircleBtn')
        
        if not create_btn:
            return {
                'success': False,
                'message': '未找到创建朋友圈按钮'
            }
        
        create_btn.tap()
        print('   ✅ 已点击创建朋友圈按钮')
        
        return {
            'success': True,
            'message': '创建朋友圈按钮点击成功'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'点击创建朋友圈按钮失败: {str(e)}'
        }
