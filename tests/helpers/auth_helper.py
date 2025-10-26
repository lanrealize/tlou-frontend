#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户认证辅助工具 - 登录、注册、登录状态验证
"""

import time
from .element_helpers import input_text_safe, tap_element_safe


# ============================================
# 内部 JavaScript 辅助函数
# ============================================

def _js_get_login_status():
    """获取用户登录状态（内部使用）"""
    return """
    function checkLoginStatus() {
        const app = getApp();
        const userStore = app.getUserStore();
        return {
            loginStatus: userStore.loginStatus,
            isLoggedIn: userStore.loginStatus === 'loggedIn',
            username: userStore.userInfo?.username || '',
            userId: userStore.userInfo?._id || '',
            userInfo: userStore.userInfo
        };
    }
    """


def _js_mock_avatar_upload(avatar_url):
    """模拟头像上传成功（内部使用）"""
    return f"""
    function mockAvatarSuccess() {{
        try {{
            const pages = getCurrentPages();
            const page = pages[pages.length - 1];
            const comp = page.selectComponent('#userInfoPopup');
            
            if (!comp) {{
                return {{ success: false, reason: 'component_not_found' }};
            }}
            
            // 直接设置组件状态，模拟上传成功
            comp.setData({{
                avatarUrl: '{avatar_url}',
                isUploadingAvatar: false
            }}, () => {{
                // 触发检查提交按钮状态
                comp.checkCanSubmit();
            }});
            
            return {{ 
                success: true,
                canSubmit: comp.data.canSubmit,
                avatarUrl: comp.data.avatarUrl
            }};
        }} catch (e) {{
            return {{ success: false, reason: e.message }};
        }}
    }}
    """


def _js_check_submit_button_enabled():
    """检查提交按钮是否启用（内部使用）"""
    return """
    function checkCanSubmit() {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const comp = page.selectComponent('#userInfoPopup');
        
        return {
            canSubmit: comp.data.canSubmit,
            isUploading: comp.data.isUploadingAvatar,
            avatarUrl: comp.data.avatarUrl
        };
    }
    """


def _evaluate_js(mini, js_function):
    """执行 JavaScript 代码并返回结果（内部工具函数）"""
    result = mini.app.evaluate(js_function.strip(), sync=True)
    return result.get('result', {}).get('result', {})


# ============================================
# 用户认证
# ============================================

def complete_user_login(mini, nickname='测试用户', avatar_url='https://tlou.images.wltech-service.site/testResources/testAvatar.jpg'):
    """
    完成用户登录流程（通过 user-info-popup）
    
    此函数处理完整的登录流程：
    1. 验证 user-info-popup 已显示
    2. 输入昵称
    3. 模拟头像上传成功（绕过官方组件限制）
    4. 点击提交按钮进行真实注册
    5. 验证登录成功
    
    Args:
        mini: Minium 实例
        nickname: 用户昵称
        avatar_url: 头像URL
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'user_info': dict,
            'login_status': str
        }
    """
    try:
        from .popup_helper import check_popup_visible
        
        print('🔐 开始用户登录流程...')
        
        # 1. 验证弹窗已显示
        popup_result = check_popup_visible(mini)
        if not popup_result['visible']:
            return {
                'success': False,
                'message': 'user-info-popup 未显示',
                'user_info': None,
                'login_status': None
            }
        
        print(f'   ✅ 弹窗已显示: "{popup_result["reason"]}"')
        time.sleep(0.3)
        
        # 2. 输入昵称
        print('   📝 输入昵称...')
        page = mini.app.current_page
        
        try:
            input_text_safe(page, 'user-info-popup >>> .nickname-input', nickname)
            print(f'   ✅ 已输入昵称: {nickname}')
        except Exception as e:
            return {
                'success': False,
                'message': f'输入昵称失败: {str(e)}',
                'user_info': None,
                'login_status': None
            }
        
        # 3. 模拟头像上传成功
        print('   🖼️ 模拟头像上传成功...')
        
        mock_data = _evaluate_js(mini, _js_mock_avatar_upload(avatar_url))
        
        if not mock_data.get('success'):
            return {
                'success': False,
                'message': f'头像设置失败: {mock_data.get("reason")}',
                'user_info': None,
                'login_status': None
            }
        
        print(f'   ✅ 头像已设置')
        time.sleep(0.5)
        
        # 4. 验证可以提交
        check_data = _evaluate_js(mini, _js_check_submit_button_enabled())
        
        if not check_data.get('canSubmit'):
            return {
                'success': False,
                'message': '提交按钮未启用',
                'user_info': None,
                'login_status': None
            }
        
        print('   ✅ 可以提交')
        
        # 5. 点击提交按钮
        print('   🚀 点击提交按钮（真实注册）...')
        
        try:
            tap_element_safe(page, 'user-info-popup >>> .action-btn', wait_after=0.2)
            print('   ✅ 已点击提交')
        except Exception as e:
            return {
                'success': False,
                'message': f'点击提交按钮失败: {str(e)}',
                'user_info': None,
                'login_status': None
            }
        
        # 6. 等待注册完成
        print('   ⏳ 等待注册完成...')
        time.sleep(3.0)
        
        # 7. 验证弹窗关闭
        verify_popup = check_popup_visible(mini)
        if verify_popup['visible']:
            return {
                'success': False,
                'message': '注册可能失败，弹窗仍然显示',
                'user_info': None,
                'login_status': None
            }
        
        print('   ✅ 弹窗已关闭')
        
        # 8. 验证登录状态
        login_result = verify_login_status(mini)
        
        if login_result['success']:
            print('   ✅ 登录验证成功')
            return {
                'success': True,
                'message': '登录成功',
                'user_info': login_result['user_info'],
                'login_status': login_result['login_status']
            }
        else:
            return {
                'success': False,
                'message': f'登录验证失败: {login_result["message"]}',
                'user_info': None,
                'login_status': login_result.get('login_status')
            }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'登录过程异常: {str(e)}',
            'user_info': None,
            'login_status': None
        }


def verify_login_status(mini, check_page_ui=False):
    """
    验证用户登录状态
    
    Args:
        mini: Minium 实例
        check_page_ui: 是否检查页面特定的UI变化
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'login_status': str,
            'user_info': dict,
            'page_ui_ok': bool
        }
    """
    try:
        # 1. 检查全局登录状态（适用于所有页面）
        login_data = _evaluate_js(mini, _js_get_login_status())
        
        login_status = login_data.get('loginStatus')
        is_logged_in = login_data.get('isLoggedIn', False)
        user_info = login_data.get('userInfo')
        username = login_data.get('username')
        user_id = login_data.get('userId')
        
        if not is_logged_in:
            return {
                'success': False,
                'message': f'登录状态异常: {login_status}',
                'login_status': login_status,
                'user_info': user_info,
                'page_ui_ok': None
            }
        
        page_ui_result = None
        
        # 2. 可选的页面UI检查
        if check_page_ui:
            current_page = mini.app.current_page
            page_path = current_page.path
            
            if page_path == '/pages/main/main':
                # main页面：检查是否隐藏了浏览提示卡片
                try:
                    browse_tip = current_page.get_element('.browse-tip-card')
                    page_ui_result = browse_tip is None
                except:
                    page_ui_result = True
            
            elif page_path == '/pages/details/details':
                # details页面：可以添加特定的UI检查
                page_ui_result = True
            
            else:
                page_ui_result = True
        
        return {
            'success': True,
            'message': f'登录成功 - {username} ({user_id[:8]}...)' if user_id else f'登录成功 - {username}',
            'login_status': login_status,
            'user_info': user_info,
            'page_ui_ok': page_ui_result
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'登录状态检查异常: {str(e)}',
            'login_status': None,
            'user_info': None,
            'page_ui_ok': None
        }

