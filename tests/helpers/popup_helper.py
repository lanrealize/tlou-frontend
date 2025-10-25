#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
弹窗辅助工具 - 检测、关闭、等待弹窗消失

测试规则：
- ✅ 所有 UI 交互必须使用 Minium 模拟真实用户操作
- ✅ 点击、输入、滑动等操作都通过 Minium 完成
- ✅ 只有状态查询允许和确认允许使用js代码完成
- ❌ 不再使用 JavaScript 直接操作页面数据或调用方法（特殊情况除外）
- 📖 这样可以确保测试真实反映用户体验
"""

import time
from .js_helpers import js_check_popup_visible, evaluate_js


def check_popup_visible(mini, expected_reason=None):
    """检查注册弹窗是否显示，并可选地验证弹窗文字
    
    Args:
        mini: minium实例
        expected_reason: 期望的弹窗提示文字（可选，用于验证文字是否正确）
        
    Returns:
        dict: {
            'visible': bool,  # 弹窗是否显示
            'reason': str,    # 实际的提示文字（副标题）
            'match': bool     # 文字是否匹配（如果提供了expected_reason）
        }
    """
    try:
        # 等待弹窗动画完成
        time.sleep(0.15)
        
        # 使用封装的 JavaScript 函数
        actual_result = evaluate_js(mini, js_check_popup_visible())
        
        visible = actual_result.get('visible', False)
        reason = actual_result.get('reason', '')
        
        # 如果提供了期望文字，进行验证
        match = None
        if expected_reason is not None:
            match = (reason == expected_reason)
            if match:
                print(f'✅ 弹窗文字验证通过: "{reason}"')
            else:
                print(f'⚠️  弹窗文字不匹配!')
                print(f'   期望: "{expected_reason}"')
                print(f'   实际: "{reason}"')
        
        return {
            'visible': visible,
            'reason': reason,
            'match': match
        }
        
    except Exception as e:
        print(f'❌ 检查弹窗失败: {e}')
        import traceback
        traceback.print_exc()
        return {
            'visible': False,
            'reason': '',
            'match': False if expected_reason is not None else None
        }


def close_popup_by_mask(mini, wait_visible=0.4, verify_closed=True):
    """通过点击遮罩层关闭弹窗
    
    Args:
        mini: minium实例
        wait_visible: 关闭前等待时间，让用户能看到弹窗（秒）
        verify_closed: 是否验证弹窗已关闭
    
    Returns:
        bool: True表示成功关闭，False表示失败
    """
    try:
        # 等待一小段时间，让用户能看到弹窗
        if wait_visible > 0:
            time.sleep(wait_visible)
        
        # 先检查弹窗是否真的存在
        check_result = check_popup_visible(mini)
        if not check_result['visible']:
            print('ℹ️  弹窗未显示，无需关闭')
            return True  # 已经关闭了，返回成功
        
        # 使用Minium模拟用户点击遮罩层
        page = mini.app.current_page
        try:
            # 找到遮罩层元素并点击
            # 注意：user-info-popup 是 Component，需要用 >>> 穿透组件边界
            mask = page.get_element('user-info-popup >>> .user-info-popup-mask')
            if not mask:
                print('❌ 未找到遮罩层元素')
                return False
            
            mask.tap()
            print('✅ 已通过Minium点击遮罩层关闭弹窗')
            time.sleep(0.2)
            
        except Exception as e:
            print(f'❌ 点击遮罩层失败: {str(e)}')
            import traceback
            traceback.print_exc()
            return False
        
        # 验证弹窗是否真的消失了
        if verify_closed:
            verify_result = check_popup_visible(mini)
            if verify_result['visible']:
                print('❌ 验证失败：弹窗仍然可见！')
                return False
            else:
                print('✅ 已验证：弹窗已消失')
                return True
        
        return True
        
    except Exception as e:
        print(f'⚠️  关闭弹窗失败: {e}')
        import traceback
        traceback.print_exc()
        return False


def ensure_popup_closed(mini):
    """确保弹窗已关闭
    
    这是一个便捷方法，会检测弹窗是否显示，如果显示则关闭并等待消失
    
    Args:
        mini: minium实例
    
    Returns:
        bool: True表示成功确保弹窗关闭，False表示失败
    """
    try:
        # 检查弹窗是否显示
        result = check_popup_visible(mini)
        
        if result['visible']:
            # 关闭弹窗（不等待，因为这是清理操作）
            close_popup_by_mask(mini, wait_visible=0)
            time.sleep(0.1)
        
        return True
        
    except Exception as e:
        print(f'⚠️  确保弹窗关闭失败: {e}')
        return False
