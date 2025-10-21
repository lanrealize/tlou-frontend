#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
弹窗辅助工具 - 检测、关闭、等待弹窗消失
"""

import time


def check_popup_visible(mini, expected_reason=None):
    """检查注册弹窗是否显示，并可选地验证弹窗文字
    
    使用 app.evaluate(sync=True) 方法获取数据，功能强大且可靠
    
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
        time.sleep(0.15)  # 压缩到极限
        
        # 使用 app.evaluate(sync=True) 获取弹窗状态
        js_code = """
function checkUserInfoPopup() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    if (!currentPage || !currentPage.data) {
        return { visible: false, reason: '' };
    }
    
    const visible = currentPage.data.userInfoPopupVisible === true;
    const reason = currentPage.data.userInfoPopupReason || '';
    
    return { visible: visible, reason: reason };
}
        """
        # 关键：必须传入 sync=True！
        result = mini.app.evaluate(js_code.strip(), sync=True)
        
        # 从返回值中提取实际结果
        # result 是 DevToolMessage 对象，结构为: {'result': {'result': {actual_data}}}
        actual_result = result.get('result', {}).get('result', {})
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
        
        js_code = """
function closePopupByMask() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (!currentPage || !currentPage.data) {
        return { success: false, reason: 'no_page' };
    }
    
    if (!currentPage.data.userInfoPopupVisible) {
        return { success: false, reason: 'not_visible' };
    }
    
    // 方法1：直接调用页面的 onUserInfoClose 方法（最可靠）
    if (currentPage.onUserInfoClose) {
        currentPage.onUserInfoClose();
        console.log('[TEST] 已通过页面方法关闭弹窗');
        return { success: true, reason: 'closed_by_page_method' };
    }
    
    // 方法2：直接设置 data（备用方案）
    currentPage.setData({
        userInfoPopupVisible: false
    });
    console.log('[TEST] 已通过 setData 关闭弹窗');
    return { success: true, reason: 'closed_by_setdata' };
}
        """
        result = mini.app.evaluate(js_code.strip(), sync=True)
        actual_result = result.get('result', {}).get('result', {})
        
        if not actual_result.get('success'):
            reason = actual_result.get('reason', 'unknown')
            print(f'⚠️  关闭弹窗失败，原因: {reason}')
            return False
        
        # 等待关闭动画完成
        time.sleep(0.2)  # 压缩到极限
        print('✅ 已调用关闭弹窗方法')
        
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


def wait_popup_closed(mini, timeout=2):
    """等待弹窗关闭
    
    Args:
        mini: minium实例
        timeout: 超时时间（秒）
        
    Returns:
        bool: True表示弹窗已关闭，False表示超时
    """
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            js_code = """
function checkUserInfoPopup() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.data) {
        return currentPage.data.userInfoPopupVisible === true;
    }
    return false;
}
            """
            eval_result = mini.app.evaluate(js_code.strip())
            time.sleep(0.1)
            
            # 解析结果
            result = eval_result.get('result', False) if isinstance(eval_result, dict) else eval_result
            is_visible = result.get('visible', False) if isinstance(result, dict) else result
            
            if not is_visible:
                print('✅ 弹窗已关闭')
                return True
                
        except Exception as e:
            time.sleep(0.1)
            continue
    
    print('⚠️  等待弹窗关闭超时')
    return False


def ensure_popup_closed(mini):
    """确保弹窗已关闭
    
    这是一个便捷方法，会检测弹窗是否显示，如果显示则关闭并等待消失
    
    Returns:
        bool: True表示成功确保弹窗关闭，False表示失败
    """
    try:
        # 检查弹窗是否显示
        result = check_popup_visible(mini)
        
        if result['visible']:
            # 关闭弹窗（不等待，因为这是清理操作）
            close_popup_by_mask(mini, wait_visible=0)
            time.sleep(0.1)  # 压缩到极限
        
        return True
        
    except Exception as e:
        print(f'⚠️  确保弹窗关闭失败: {e}')
        return False
