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


def click_apply_join_button(mini):
    """点击申请加入或接受邀请按钮
    
    适用场景：
    - 在 details 页面点击 circle-status-action 组件中的操作按钮
    - 支持"申请加入"按钮（需要审核）
    - 支持"接受邀请"按钮（无需等待审核）
    
    Args:
        mini: Minium 实例
    
    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        page = mini.app.current_page
        action_btn = page.get_element('circle-status-action >>> #actionBtn')
        
        if not action_btn:
            return {
                'success': False,
                'message': '未找到操作按钮'
            }
        
        # 获取按钮文本，验证是否为有效的操作按钮
        btn_text = action_btn.text
        valid_texts = ['接受邀请', '加入中', '申请加入', '申请中']
        if not any(text in btn_text for text in valid_texts):
            return {
                'success': False,
                'message': f'按钮状态不正确，当前文本：{btn_text}'
            }
        
        action_btn.tap()
        
        # 根据按钮文本提供不同的日志消息
        if '申请加入' in btn_text or '申请中' in btn_text:
            print('   ✅ 已点击申请加入按钮')
            message = '申请加入按钮点击成功'
        else:
            print('   ✅ 已点击接受邀请按钮')
            message = '接受邀请按钮点击成功'
        
        return {
            'success': True,
            'message': message
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'点击操作按钮失败: {str(e)}'
        }