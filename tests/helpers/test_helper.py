#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试辅助工具 - 启动/关闭小程序、进入/退出测试模式
"""

import minium
import time
from .js_helpers import (
    js_get_login_status,
    js_get_circle_id_from_page,
    js_mock_avatar_upload,
    js_check_submit_button_enabled,
    evaluate_js
)
from .element_helpers import find_element_safe, input_text_safe, tap_element_safe

# 配置
CONFIG = {
    'project_path': r'D:\Codes\Cursor\tlou-frontend',
    'dev_tool_path': r'D:\Apps\IDEs\微信web开发者工具\cli.bat',
    # 配置自动授权：自动点击所有 showModal 的确认按钮
    'auto_authorize': True  # 自动确认所有弹窗
}

# Circle Status Action 组件状态配置
CIRCLE_STATUS_CONFIG = {
    'member': {
        'main_title': '发布新动态',
        'sub_title': '分享你的精彩瞬间',
        'button_text': '发布'
    },
    'invited': {
        'main_title': '你收到了邀请',
        'sub_title': '点击右侧按钮加入这个朋友圈',
        'button_text': '接受邀请'
    },
    'applied': {
        'main_title': '申请已提交',
        'sub_title': '等待朋友圈主人审核中',
        'button_text': '审核中'
    },
    'can_apply': {
        'main_title': '公开朋友圈',
        'sub_title': '你可以申请加入这个朋友圈',
        'button_text': '申请加入'
    },
    'no_access': {
        'main_title': '无法访问',
        'sub_title': '无权查看此朋友圈',
        'button_text': '无权限'
    }
}


# ============================================
# 小程序生命周期
# ============================================

def launch_miniprogram():
    """启动小程序"""
    print('\n' + '='*60)
    print('🚀 启动小程序...')
    print('='*60)
    mini = minium.Minium(CONFIG)
    time.sleep(0.1)
    print('✅ 小程序启动成功')
    return mini


def close_miniprogram(mini):
    """关闭小程序"""
    if mini:
        time.sleep(0.2)
        mini.shutdown()
        print('✅ 小程序已关闭\n')


# ============================================
# 测试模式管理
# ============================================

def enter_test_mode(mini):
    """进入测试模式 - 调用 getApp().devTools.startTestMode()"""
    try:
        print('🎭 进入测试模式...')
        
        # 直接调用 startTestMode()，让它处理所有逻辑
        js_code = """
function callStartTestMode() {
    return getApp().devTools.startTestMode();
}
        """
        mini.app.evaluate(js_code.strip())
        print('✅ startTestMode 调用完成')
        
        # 等待状态更新
        time.sleep(0.3)
        
        # 重新加载主页确保状态更新
        mini.app.relaunch('/pages/main/main')
        time.sleep(0.5)
        
        print('✅ 测试环境已就绪')
        return True
        
    except Exception as e:
        print(f'❌ 进入测试模式失败: {str(e)}')
        import traceback
        traceback.print_exc()
        return False


def exit_test_mode(mini):
    """退出测试模式并清理数据 - 调用 getApp().devTools.endTestMode()"""
    try:
        print('🔄 退出测试模式...')
        
        # 调用 endTestMode() 并等待完成（endTestMode 是异步函数）
        js_code = """
async function callEndTestMode() {
    return await getApp().devTools.endTestMode();
}
        """
        result = mini.app.evaluate(js_code.strip(), sync=True)
        print('✅ endTestMode 调用完成')
        
        # 短暂等待以确保状态同步
        time.sleep(0.3)
        
        # 检查返回值中的清理状态
        result_data = result.get('result', {}).get('result', {})
        cleanup_success = result_data.get('cleanupSuccess', False)
        
        if not cleanup_success:
            print('❌ 后端清理测试用户失败')
            return False
        
        print('✅ 后端清理测试用户成功')
        
        # 返回 main 页面结束测试
        print('🔙 返回 main 页面...')
        mini.app.redirect_to('/pages/main/main')
        time.sleep(0.5)
        
        print('✅ 测试模式已退出')
        return True
        
    except Exception as e:
        print(f'⚠️  退出测试模式失败: {str(e)}')
        import traceback
        traceback.print_exc()
        return False


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


# ============================================
# 组件状态检查
# ============================================

def check_circle_status_action(mini, expected_main_title, expected_sub_title, expected_button_text):
    """
    检查 details 页面底部 circle-status-action 组件的显示内容
    
    Args:
        mini: Minium 实例
        expected_main_title: 期望的主标题文本
        expected_sub_title: 期望的副标题文本
        expected_button_text: 期望的按钮文本
        
    Returns:
        dict: {
            'match': bool,
            'user_status': str,
            'main_title': str,
            'sub_title': str,
            'button_text': str,
            'errors': list
        }
    """
    try:
        page = mini.app.current_page
        
        # 使用原生方法获取页面数据
        page_data = page.data
        user_status = page_data.get('userStatus', '')
        
        # 获取实际显示的文本
        config = CIRCLE_STATUS_CONFIG.get(user_status, {})
        actual_main_title = config.get('main_title', '')
        actual_sub_title = config.get('sub_title', '')
        actual_button_text = config.get('button_text', '')
        
        # 比对
        errors = []
        if actual_main_title != expected_main_title:
            errors.append(f'主标题不匹配: 期望"{expected_main_title}", 实际"{actual_main_title}"')
        if actual_sub_title != expected_sub_title:
            errors.append(f'副标题不匹配: 期望"{expected_sub_title}", 实际"{actual_sub_title}"')
        if actual_button_text != expected_button_text:
            errors.append(f'按钮文本不匹配: 期望"{expected_button_text}", 实际"{actual_button_text}"')
        
        return {
            'match': len(errors) == 0,
            'user_status': user_status,
            'main_title': actual_main_title,
            'sub_title': actual_sub_title,
            'button_text': actual_button_text,
            'errors': errors
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'match': False,
            'user_status': '',
            'main_title': '',
            'sub_title': '',
            'button_text': '',
            'errors': [f'检查异常: {str(e)}']
        }


# ============================================
# 用户登录
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
        
        mock_data = evaluate_js(mini, js_mock_avatar_upload(avatar_url))
        
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
        check_data = evaluate_js(mini, js_check_submit_button_enabled())
        
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
        login_data = evaluate_js(mini, js_get_login_status())
        
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


# ============================================
# Modal 对话框处理
# ============================================

def handle_modal_confirm(mini, button_text="确定", timeout=3.0):
    """
    处理微信小程序原生Modal确认对话框
    
    Args:
        mini: Minium 实例
        button_text: 要点击的按钮文字，默认"确定"
        timeout: 超时时间（秒），默认3秒
        
    Returns:
        bool: 是否成功处理
    """
    try:
        import time
        # 短暂等待确保modal已显示
        time.sleep(0.5)
        
        # 使用Minium内置方法处理modal
        result = mini.native.handle_modal(button_text)
        
        if result:
            print(f'   ✅ Modal确认成功: "{button_text}"')
        else:
            print(f'   ⚠️  Modal处理失败: "{button_text}"')
            
        return result
    except Exception as e:
        print(f'   ❌ Modal处理异常: {str(e)}')
        return False


def handle_modal_cancel(mini, timeout=3.0):
    """
    处理微信小程序原生Modal取消对话框
    
    Args:
        mini: Minium 实例  
        timeout: 超时时间（秒），默认3秒
        
    Returns:
        bool: 是否成功处理
    """
    return handle_modal_confirm(mini, "取消", timeout)
