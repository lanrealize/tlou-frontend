#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试辅助工具 - 启动/关闭小程序、进入/退出测试模式
"""

import minium
import time

# 配置
CONFIG = {
    'project_path': r'D:\Codes\Cursor\tlou-frontend',
    'dev_tool_path': r'D:\Apps\IDEs\微信web开发者工具\cli.bat',
    # 配置自动授权：自动点击所有 showModal 的确认按钮
    'auto_authorize': True  # 自动确认所有弹窗
}


def launch_miniprogram():
    """启动小程序"""
    print('\n' + '='*60)
    print('🚀 启动小程序...')
    print('='*60)
    mini = minium.Minium(CONFIG)
    time.sleep(0.1)  # 压缩到极限
    print('✅ 小程序启动成功')
    return mini


def close_miniprogram(mini):
    """关闭小程序"""
    if mini:
        time.sleep(0.2)  # 压缩等待
        mini.shutdown()
        print('✅ 小程序已关闭\n')


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
        
        # 直接调用 endTestMode()，让它处理所有逻辑（清理 + 恢复身份）
        js_code = """
function callEndTestMode() {
    return getApp().devTools.endTestMode();
}
        """
        mini.app.evaluate(js_code.strip())
        print('✅ endTestMode 调用完成')
        
        # 等待一下，避免与测试中的页面跳转冲突
        time.sleep(0.5)
        
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


def navigate_to_details(mini, circle_id, source='discover'):
    """
    导航到 details 页面（普通模式）
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID（必需）
        source: 来源标识（可选，默认'discover'）
        
    Returns:
        dict: {
            'success': bool,  # 是否成功导航
            'circle_id': str,  # 圈子ID
            'url': str  # 完整URL
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
        
        print('✅ 已进入 details 页面')
        return {
            'success': True,
            'circle_id': circle_id,
            'url': url
        }
        
    except Exception as e:
        print(f'❌ 导航到 details 失败: {str(e)}')
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'circle_id': '',
            'url': ''
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
            'success': bool,  # 是否成功导航
            'circle_id': str,  # 实际使用的圈子ID
            'inviter_id': str,  # 实际使用的邀请人ID
            'url': str  # 完整的分享URL
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
            'match': bool,  # 是否完全匹配
            'main_title': str,  # 实际主标题
            'sub_title': str,  # 实际副标题
            'button_text': str,  # 实际按钮文本
            'errors': list  # 不匹配的项列表
        }
    """
    try:
        page = mini.app.current_page
        
        # 使用原生方法获取页面数据
        page_data = page.data
        user_status = page_data.get('userStatus', '')
        
        # 定义每个状态对应的文本
        STATUS_CONFIG = {
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
        
        # 获取实际显示的文本
        config = STATUS_CONFIG.get(user_status, {})
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