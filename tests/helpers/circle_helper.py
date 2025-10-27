#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
朋友圈相关 Helper 函数
直接从 test_complete_user_flow.py 中抽取封装，保持原有逻辑不变
"""

import time
import re

# Circle Status Action 组件状态配置
CIRCLE_STATUS_CONFIG = {
    'member': {'main_title': '发布新动态', 'sub_title': '分享你的精彩瞬间', 'button_text': '发布'},
    'applied': {'main_title': '申请已提交', 'sub_title': '等待朋友圈主人审核中', 'button_text': '审核中'},
    'invited_applied': {'main_title': '你收到了邀请', 'sub_title': '点击右侧按钮可直接加入（无需等待审核）', 'button_text': '接受邀请'},
    'invited': {'main_title': '你收到了邀请', 'sub_title': '点击右侧按钮加入这个朋友圈', 'button_text': '接受邀请'},
    'can_apply': {'main_title': '公开朋友圈', 'sub_title': '你可以申请加入这个朋友圈', 'button_text': '申请加入'},
    'no_access': {'main_title': '无法访问', 'sub_title': '无权查看此朋友圈', 'button_text': '无权限'},
    'guest_invited': {'main_title': '你收到了邀请', 'sub_title': '点击右侧按钮加入这个朋友圈', 'button_text': '接受邀请'},
    'guest_can_apply': {'main_title': '公开朋友圈', 'sub_title': '你可以申请加入这个朋友圈', 'button_text': '申请加入'},
}


def create_circle(mini):
    """创建新朋友圈（从 step_2 完整抽取，保留所有获取ID的方法）
    
    Args:
        mini: Minium 实例
        
    Returns:
        dict: {
            'success': bool,
            'circle_id': str,
            'message': str
        }
    """
    try:
        print('\n🆕 创建新朋友圈...')
        
        page = mini.app.current_page
        
        # 点击创建朋友圈按钮
        create_btn = page.get_element('#createCircleBtn')
        if not create_btn:
            raise Exception('未找到创建朋友圈按钮')
        
        create_btn.tap()
        print('   ✅ 已点击创建朋友圈按钮')
        
        # 直接从日志中我们知道朋友圈已成功创建
        # 先尝试简单等待，然后直接获取ID
        time.sleep(3.0)
        
        # 多种方式获取朋友圈ID
        circle_id = ''
        
        # 方法1：等待并检查导航
        max_wait = 8
        wait_time = 0
        while wait_time < max_wait and not circle_id:
            current_page = mini.app.current_page
            if 'details' in current_page.path:
                # 从当前页面获取朋友圈ID
                
                # 从query参数获取
                page_query = getattr(current_page, 'query', {})
                if 'circleId' in page_query:
                    circle_id = page_query['circleId']
                    print(f'   ✅ 从页面query获得朋友圈ID: {circle_id[:8]}...')
                    break
                
                # 从URL解析
                if not circle_id:
                    url_match = re.search(r'circleId=([a-f0-9]+)', current_page.path)
                    if url_match:
                        circle_id = url_match.group(1)
                        print(f'   ✅ 从URL解析获得朋友圈ID: {circle_id[:8]}...')
                        break
                
                # 从页面数据获取
                if not circle_id:
                    circle_data = current_page.data.get('circle', {})
                    circle_id = circle_data.get('_id', '')
                    if circle_id:
                        print(f'   ✅ 从页面数据获得朋友圈ID: {circle_id[:8]}...')
                        break
            
            time.sleep(0.5)
            wait_time += 0.5
        
        # 方法2：从用户信息获取最新朋友圈ID
        if not circle_id:
            print('   🔍 从用户信息获取最新朋友圈ID...')
            from .auth_helper import get_user_state
            
            try:
                state = get_user_state(mini)
                circles = state['user_info'].get('circles', [])
                
                if circles and len(circles) > 0:
                    latest = circles[-1]
                    circle_id = latest.get('_id') or latest.get('id', '')
                    if circle_id:
                        print(f'   ✅ 从用户信息获得朋友圈ID: {circle_id[:8]}... (用户共有{len(circles)}个朋友圈)')
                else:
                    print(f'   ⚠️  从用户信息获取失败: 用户没有朋友圈')
            except Exception as e:
                print(f'   ⚠️  从用户信息获取失败: {str(e)}')
        
        # 方法3：使用JavaScript直接查询全局状态
        if not circle_id:
            print('   🔍 查询全局状态...')
            js_get_global = '''
            function getCircleFromGlobalState() {
                try {
                    const pages = getCurrentPages();
                    for (let i = pages.length - 1; i >= 0; i--) {
                        const page = pages[i];
                        if (page.route && page.route.includes('details') && page.options && page.options.circleId) {
                            return { success: true, circleId: page.options.circleId, source: 'page_options' };
                        }
                    }
                    return { success: false, reason: 'no_circle_in_global_state' };
                } catch (e) {
                    return { success: false, reason: e.message };
                }
            }
            '''
            
            result = mini.app.evaluate(js_get_global.strip(), sync=True)
            global_data = result.get('result', {}).get('result', {})
            
            if global_data.get('success'):
                circle_id = global_data.get('circleId')
                print(f'   ✅ 从全局状态获得朋友圈ID: {circle_id[:8]}...')
        
        # 如果还是没有获取到，手动导航并重试
        if not circle_id:
            print('   ⚠️  无法自动获取朋友圈ID，检查当前状态...')
            current_page = mini.app.current_page
            print(f'      当前页面: {current_page.path}')
            
            # 如果不在details页面，说明创建可能失败了
            if 'details' not in current_page.path:
                raise Exception(f'朋友圈创建后未导航到详情页，当前页面: {current_page.path}')
            else:
                # 在details页面但没有circleId，这很奇怪
                raise Exception('在详情页面但无法获取朋友圈ID，可能存在页面状态问题')
        
        # 确保在正确的详情页面 - 更安全的导航方式
        current_page = mini.app.current_page
        if 'details' not in current_page.path:
            try:
                print(f'   📍 尝试导航到详情页...')
                # 使用较短的超时时间，避免长时间等待
                mini.app.navigate_to(f'/pages/details/details?circleId={circle_id}')
                time.sleep(2.0)
                
                # 验证导航是否成功
                current_page = mini.app.current_page
                if 'details' not in current_page.path:
                    print(f'   ⚠️  导航失败，但朋友圈已创建，继续测试')
                else:
                    print(f'   ✅ 成功导航到详情页')
                    
            except Exception as e:
                print(f'   ⚠️  导航超时或失败: {str(e)[:100]}...')
                print(f'   💡 朋友圈已创建成功，跳过导航继续测试')
        else:
            print(f'   ✅ 已在详情页面')
        
        print(f'   ✅ 朋友圈创建成功: {circle_id[:8]}...')
        
        return {
            'success': True,
            'circle_id': circle_id,
            'message': f'朋友圈创建成功: {circle_id[:8]}...'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'创建失败: {str(e)}'
        }


def check_circle_status_action(mini, expected_user_status):
    """检查 details 页面底部 circle-status-action 组件的 UI 显示内容
    
    Args:
        mini: Minium 实例
        expected_user_status: 期望的用户状态 (如 'guest_can_apply', 'member' 等)
    """
    try:
        page = mini.app.current_page
        actual_user_status = page.data.get('userStatus', '')
        
        # 验证 userStatus 是否正确
        if actual_user_status != expected_user_status:
            return {
                'match': False,
                'user_status': actual_user_status,
                'errors': [f'userStatus不匹配: 期望"{expected_user_status}", 实际"{actual_user_status}"']
            }
        
        # 从配置读取期望值
        expected_config = CIRCLE_STATUS_CONFIG.get(expected_user_status, {})
        if not expected_config:
            return {
                'match': False,
                'user_status': actual_user_status,
                'errors': [f'配置中不存在状态: {expected_user_status}']
            }
        
        expected_main_title = expected_config['main_title']
        expected_sub_title = expected_config['sub_title']
        expected_button_text = expected_config['button_text']
        
        # 从 UI 真正读取显示的文本
        try:
            main_title_elem = page.get_element('circle-status-action >>> #mainTitle')
            sub_title_elem = page.get_element('circle-status-action >>> #subTitle')
            action_btn_elem = page.get_element('circle-status-action >>> #actionBtn')
            
            actual_main_title = main_title_elem.text if main_title_elem else ''
            actual_sub_title = sub_title_elem.text if sub_title_elem else ''
            actual_button_text = action_btn_elem.text if action_btn_elem else ''
        except Exception as e:
            return {
                'match': False,
                'user_status': actual_user_status,
                'errors': [f'无法读取UI元素: {str(e)}']
            }
        
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
            'user_status': actual_user_status,
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
            'errors': [f'检查异常: {str(e)}']
        }


def set_circle_public(mini, circle_id=None):
    """设置朋友圈为公开
    
    前提条件：
    - 当前用户是朋友圈创建者
    - 朋友圈尚未设置为公开
    
    执行步骤：
    1. 确保在 details 页面（或导航过去）
    2. 点击设置按钮进入 settings 页面
    3. 点击公开设置 switch
    4. 验证设置成功
    
    Args:
        mini: Minium 实例
        circle_id: 可选的朋友圈 ID
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        print('\n🌐 设置朋友圈为公开...')
        
        # 步骤1：确保在 details 页面
        page = mini.app.current_page
        if 'details' not in page.path:
            if not circle_id:
                return {
                    'success': False,
                    'message': f'当前不在 details 页面（{page.path}），且未提供 circle_id'
                }
            
            from .navigation_helper import navigate_to_details
            nav_result = navigate_to_details(mini, circle_id)
            if not nav_result['success']:
                return {
                    'success': False,
                    'message': f'导航到 details 失败: {nav_result["error"]}'
                }
            page = mini.app.current_page
        
        print('   ✅ 当前在 details 页面')
        
        # 获取朋友圈 ID
        if not circle_id:
            circle_id = page.data.get('circle', {}).get('_id', '')
            if not circle_id:
                page_query = getattr(page, 'query', {})
                circle_id = page_query.get('circleId', '')
        
        # 步骤2：点击设置按钮进入 settings 页面
        setting_btn_wrapper = page.get_element('#setting-btn-wrapper')
        if not setting_btn_wrapper:
            return {
                'success': False,
                'message': '未找到设置按钮'
            }
        
        setting_btn_wrapper.tap()
        print('   ✅ 已点击设置按钮')
        time.sleep(1.0)
        
        settings_page = mini.app.current_page
        if 'setting' not in settings_page.path:
            return {
                'success': False,
                'message': f'未能进入 settings 页面，当前在: {settings_page.path}'
            }
        print('   ✅ 已进入 settings 页面')
        
        time.sleep(0.5)
        
        # 检查当前是否已经是公开状态
        is_public_before = settings_page.data.get('settingData', {}).get('isPublic', False)
        print(f'   ℹ️  当前公开状态: {is_public_before}')
        
        if is_public_before:
            print('   ⚠️  朋友圈已经是公开状态')
            return {
                'success': True,
                'message': '朋友圈已经是公开状态',
                'was_already_public': True
            }
        
        # 步骤3：点击公开设置 switch
        public_switch = settings_page.get_element('#public-switch')
        if not public_switch:
            return {
                'success': False,
                'message': '未找到公开设置 switch'
            }
        
        public_switch.tap()
        print('   ✅ 已点击公开设置 switch')
        time.sleep(1.0)
        
        # 步骤4：验证设置成功
        settings_page = mini.app.current_page
        is_public_after = settings_page.data.get('settingData', {}).get('isPublic', False)
        print(f'   ℹ️  设置后公开状态: {is_public_after}')
        
        if not is_public_after:
            return {
                'success': False,
                'message': '设置后仍未变为公开状态'
            }
        
        print('   ✅ 朋友圈已设置为公开')
        
        return {
            'success': True,
            'message': '朋友圈已成功设置为公开',
            'was_already_public': False
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'设置公开时发生异常: {str(e)}'
        }


def apply_to_join_circle(mini):
    """点击申请加入朋友圈按钮
    
    前提条件：
    - 当前在 details 页面
    - 用户状态为 can_apply 或 guest_can_apply
    
    Args:
        mini: Minium 实例
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        print('\n📝 申请加入朋友圈...')
        
        page = mini.app.current_page
        if 'details' not in page.path:
            return {
                'success': False,
                'message': f'当前不在 details 页面: {page.path}'
            }
        
        # 点击申请加入按钮
        action_btn = page.get_element('circle-status-action >>> #actionBtn')
        if not action_btn:
            return {
                'success': False,
                'message': '未找到申请加入按钮'
            }
        
        action_btn.tap()
        print('   ✅ 已点击申请加入按钮')
        
        # 等待请求完成
        time.sleep(1.5)
        
        # 验证状态变化（应该变为 applied）
        page = mini.app.current_page
        user_status = page.data.get('userStatus', '')
        
        if user_status == 'applied':
            print('   ✅ 申请已提交，状态变为 applied')
            return {
                'success': True,
                'message': '申请加入成功'
            }
        else:
            return {
                'success': False,
                'message': f'申请提交后状态异常: {user_status}'
            }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'申请加入异常: {str(e)}'
        }


def process_unique_join_application(mini, circle_id=None, action='approve'):
    """处理朋友圈中唯一的加入申请
    
    前提条件：
    - 朋友圈中有且仅有一个待处理的加入申请
    - 当前用户是朋友圈的管理员（admin）
    
    执行步骤：
    1. 确保当前在 details 页面
    2. 验证当前用户是 admin
    3. 确认设置按钮后面显示有申请数量（pendingApplicationsCount > 0）
    4. 点击设置按钮进入 settings 页面
    5. 点击接受/拒绝申请按钮
    6. 验证处理结果
    
    Args:
        mini: Minium 实例
        circle_id: 可选的朋友圈 ID，如果不提供则从当前页面获取
        action: 'approve' 或 'reject'，默认为 'approve'
        
    Returns:
        dict: {
            'success': bool,
            'applicant_id': str,           # 申请者 ID
            'applicant_username': str,     # 申请者用户名
            'action': str,                 # 'approve' 或 'reject'
            'message': str
        }
    """
    try:
        from .auth_helper import get_user_state
        
        if action not in ['approve', 'reject']:
            return {
                'success': False,
                'message': f'无效的操作类型: {action}，必须是 "approve" 或 "reject"'
            }
        
        action_text = '接受' if action == 'approve' else '拒绝'
        print(f'\n🔄 处理唯一的加入申请 ({action_text})...')
        
        # 步骤1：确保在 details 页面
        page = mini.app.current_page
        if 'details' not in page.path:
            # 如果不在 details 页面，尝试导航过去（需要有 circle_id）
            if not circle_id:
                # 尝试从当前页面获取 circle_id
                circle_id = page.data.get('circle', {}).get('_id', '')
                if not circle_id:
                    page_query = getattr(page, 'query', {})
                    circle_id = page_query.get('circleId', '')
                
                if not circle_id:
                    return {
                        'success': False,
                        'message': f'当前不在 details 页面（{page.path}），且无法获取朋友圈 ID 进行导航'
                    }
            
            # 使用 navigate_to_details 导航
            print(f'   ⚠️  当前在 {page.path}，尝试导航到 details 页面...')
            from .navigation_helper import navigate_to_details
            
            nav_result = navigate_to_details(mini, circle_id)
            if not nav_result['success']:
                return {
                    'success': False,
                    'message': f'导航到 details 页面失败: {nav_result["error"]}'
                }
            
            print('   ✅ 已导航到 details 页面')
            page = mini.app.current_page
        else:
            print('   ✅ 当前在 details 页面')
        
        # 获取朋友圈 ID
        if not circle_id:
            circle_id = page.data.get('circle', {}).get('_id', '')
            if not circle_id:
                page_query = getattr(page, 'query', {})
                circle_id = page_query.get('circleId', '')
            
            if not circle_id:
                return {
                    'success': False,
                    'message': '无法获取朋友圈 ID'
                }
        
        print(f'   ℹ️  朋友圈 ID: {circle_id[:8]}...')
        
        # 步骤2：验证当前用户是 admin
        user_state = get_user_state(mini)
        if not user_state['is_admin']:
            return {
                'success': False,
                'message': f'当前用户不是管理员，无法处理申请。isAdmin: {user_state["is_admin"]}'
            }
        print(f'   ✅ 当前用户是管理员: {user_state["user_info"]["username"]}')
        
        # 步骤3：确认有待处理的申请
        pending_count = page.data.get('pendingApplicationsCount', 0)
        if pending_count == 0:
            return {
                'success': False,
                'message': '没有待处理的申请'
            }
        elif pending_count > 1:
            return {
                'success': False,
                'message': f'有 {pending_count} 个待处理申请，但此方法只处理唯一申请的情况'
            }
        
        print(f'   ℹ️  页面数据中待处理申请数: {pending_count}')
        
        # 验证申请数量显示在 UI 上
        pending_count_elem = page.get_element('#pending-count')
        if not pending_count_elem:
            return {
                'success': False,
                'message': '未找到申请数量显示元素'
            }
        
        pending_count_text = pending_count_elem.text.strip()
        print(f'   ℹ️  UI 显示的申请数量: {pending_count_text}')
        
        # 验证 UI 显示的数量与页面数据是否一致
        try:
            # 提取数字（去掉括号等）
            ui_count = int(pending_count_text.strip('()'))
            if ui_count != pending_count:
                return {
                    'success': False,
                    'message': f'申请数量不一致：页面数据为 {pending_count}，UI 显示为 {ui_count}'
                }
            print(f'   ✅ 申请数量验证通过: {pending_count}')
        except ValueError:
            return {
                'success': False,
                'message': f'无法解析 UI 显示的申请数量: "{pending_count_text}"'
            }
        
        # 步骤4：点击设置按钮进入 settings 页面
        setting_btn_wrapper = page.get_element('#setting-btn-wrapper')
        if not setting_btn_wrapper:
            return {
                'success': False,
                'message': '未找到设置按钮'
            }
        
        setting_btn_wrapper.tap()
        print('   ✅ 已点击设置按钮')
        
        # 等待进入 settings 页面
        time.sleep(1.0)
        
        settings_page = mini.app.current_page
        if 'setting' not in settings_page.path:
            return {
                'success': False,
                'message': f'未能进入 settings 页面，当前在: {settings_page.path}'
            }
        print('   ✅ 已进入 settings 页面')
        
        # 等待申请列表加载
        time.sleep(0.5)
        
        # 获取申请者列表
        appliers = settings_page.data.get('appliers', [])
        if len(appliers) == 0:
            return {
                'success': False,
                'message': 'settings 页面中没有申请者'
            }
        elif len(appliers) > 1:
            return {
                'success': False,
                'message': f'settings 页面中有 {len(appliers)} 个申请者，但此方法只处理唯一申请的情况'
            }
        
        applicant = appliers[0]
        applicant_id = applicant.get('_id', '')
        applicant_username = applicant.get('username', '未知用户')
        
        print(f'   ℹ️  申请者: {applicant_username} (ID: {applicant_id[:8]}...)')
        
        # 记录处理前的成员列表
        members_before = settings_page.data.get('circleMembers', [])
        member_ids_before = {m.get('_id') or m.get('id') for m in members_before}
        print(f'   ℹ️  处理前成员数: {len(members_before)}')
        
        # 步骤5：点击对应的按钮
        btn_id = f'#approve-btn-{applicant_id}' if action == 'approve' else f'#reject-btn-{applicant_id}'
        action_btn = settings_page.get_element(btn_id)
        
        if not action_btn:
            return {
                'success': False,
                'message': f'未找到{action_text}按钮: {btn_id}'
            }
        
        action_btn.tap()
        print(f'   ✅ 已点击{action_text}按钮')
        
        # 处理确认对话框
        from .common_helper import handle_modal_confirm
        if not handle_modal_confirm(mini, button_text="确定"):
            return {
                'success': False,
                'message': f'处理确认对话框失败'
            }
        
        # 等待操作完成和 toast 显示
        time.sleep(1.0)
        
        print(f'   ✅ 已确认{action_text}操作')
        
        # 步骤6：验证结果
        time.sleep(0.5)
        
        # 刷新页面数据
        settings_page = mini.app.current_page
        
        if action == 'approve':
            # 验证申请者是否出现在成员列表中
            members_after = settings_page.data.get('circleMembers', [])
            member_ids_after = {m.get('_id') or m.get('id') for m in members_after}
            
            print(f'   ℹ️  处理后成员数: {len(members_after)}')
            
            if applicant_id in member_ids_after:
                print(f'   ✅ {applicant_username} 已出现在成员数据中')
                
                # 步骤6：从 UI 上验证该成员是否显示在页面上
                member_elem = settings_page.get_element(f'.member-item-{applicant_id}')
                if not member_elem:
                    return {
                        'success': False,
                        'applicant_id': applicant_id,
                        'applicant_username': applicant_username,
                        'action': action,
                        'message': f'{applicant_username} 已加入成员数据，但未在 UI 中显示'
                    }
                
                print(f'   ✅ 在 UI 中找到了成员元素')
                
                # 验证成员元素中的用户名
                member_name_elem = member_elem.get_element('.member-name')
                if member_name_elem:
                    ui_username = member_name_elem.text.strip()
                    if ui_username == applicant_username:
                        print(f'   ✅ UI 显示的用户名正确: {ui_username}')
                    else:
                        print(f'   ⚠️  UI 显示的用户名({ui_username})与预期({applicant_username})不一致')
                
                return {
                    'success': True,
                    'applicant_id': applicant_id,
                    'applicant_username': applicant_username,
                    'action': action,
                    'members_before': len(members_before),
                    'members_after': len(members_after),
                    'message': f'成功{action_text}申请，{applicant_username} 已加入朋友圈并显示在 UI 中'
                }
            else:
                return {
                    'success': False,
                    'applicant_id': applicant_id,
                    'applicant_username': applicant_username,
                    'action': action,
                    'message': f'{action_text}操作完成，但 {applicant_username} 未出现在成员列表中'
                }
        else:
            # 验证申请者是否已从申请列表中移除
            appliers_after = settings_page.data.get('appliers', [])
            
            if len(appliers_after) == 0:
                print(f'   ✅ 申请列表已清空')
                
                # 验证成员列表中没有该用户
                members_after = settings_page.data.get('circleMembers', [])
                member_ids_after = {m.get('_id') or m.get('id') for m in members_after}
                
                if applicant_id not in member_ids_after:
                    print(f'   ✅ {applicant_username} 未出现在成员列表中')
                    return {
                        'success': True,
                        'applicant_id': applicant_id,
                        'applicant_username': applicant_username,
                        'action': action,
                        'message': f'成功{action_text}申请，{applicant_username} 未加入朋友圈'
                    }
                else:
                    return {
                        'success': False,
                        'applicant_id': applicant_id,
                        'applicant_username': applicant_username,
                        'action': action,
                        'message': f'{action_text}操作完成，但 {applicant_username} 意外出现在成员列表中'
                    }
            else:
                return {
                    'success': False,
                    'applicant_id': applicant_id,
                    'applicant_username': applicant_username,
                    'action': action,
                    'message': f'{action_text}操作完成，但申请列表仍有 {len(appliers_after)} 个申请'
                }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'处理申请时发生异常: {str(e)}'
        }


def delete_circle(mini, circle_id):
    """在 list 页面删除指定朋友圈
    
    执行步骤：
    1. 确保在 list 页面（如果不在则自动导航）
    2. 查找目标朋友圈卡片
    3. 验证有删除权限
    4. 点击三点菜单按钮
    5. 点击删除按钮
    6. 确认删除（Minium auto_authorize 自动处理）
    7. 验证朋友圈已从列表中移除
    
    Args:
        mini: Minium 实例
        circle_id: 要删除的朋友圈 ID
        
    Returns:
        dict: {
            'success': bool,
            'circle_id': str,
            'circle_name': str,
            'message': str
        }
    """
    try:
        print(f'\n🗑️  删除朋友圈: {circle_id[:8]}...')
        
        # 步骤1: 确保在 list 页面
        page = mini.app.current_page
        if 'list' not in page.path:
            print('   ⚠️  不在 list 页面，尝试导航...')
            from .navigation_helper import navigate_to_list
            
            nav_result = navigate_to_list(mini)
            if not nav_result['success']:
                return {
                    'success': False,
                    'circle_id': circle_id,
                    'circle_name': '',
                    'message': f'导航到 list 页面失败: {nav_result["message"]}'
                }
            
            page = mini.app.current_page
        
        print('   ✅ 当前在 list 页面')
        
        # 步骤2: 查找目标朋友圈卡片
        circles = page.data.get('circles', [])
        target_circle = None
        
        for circle in circles:
            if circle.get('_id') == circle_id or circle.get('id') == circle_id:
                target_circle = circle
                break
        
        if not target_circle:
            return {
                'success': False,
                'circle_id': circle_id,
                'circle_name': '',
                'message': f'在页面数据中未找到朋友圈 {circle_id[:8]}...'
            }
        
        circle_name = target_circle.get('name', '未知朋友圈')
        print(f'   ℹ️  找到目标朋友圈: {circle_name}')
        
        # 步骤3: 验证有删除权限
        has_permission = target_circle.get('hasDeletePermission', False)
        if not has_permission:
            return {
                'success': False,
                'circle_id': circle_id,
                'circle_name': circle_name,
                'message': f'当前用户没有删除权限'
            }
        
        print('   ✅ 已确认有删除权限')
        
        # 记录删除前的朋友圈数量
        circles_before = len(circles)
        print(f'   ℹ️  删除前朋友圈数: {circles_before}')
        
        # 步骤4: 点击三点菜单按钮
        more_menu_selector = f'discover-circle-card >>> #more-menu-{circle_id}'
        more_menu = page.get_element(more_menu_selector)
        
        if not more_menu:
            return {
                'success': False,
                'circle_id': circle_id,
                'circle_name': circle_name,
                'message': f'未找到三点菜单按钮: {more_menu_selector}'
            }
        
        more_menu.tap()
        print('   ✅ 已点击三点菜单')
        
        # 等待下拉菜单显示
        time.sleep(0.5)
        
        # 步骤5: 点击删除按钮
        delete_btn_selector = f'discover-circle-card >>> #delete-btn-{circle_id}'
        delete_btn = page.get_element(delete_btn_selector)
        
        if not delete_btn:
            return {
                'success': False,
                'circle_id': circle_id,
                'circle_name': circle_name,
                'message': f'未找到删除按钮: {delete_btn_selector}'
            }
        
        delete_btn.tap()
        print('   ✅ 已点击删除按钮')
        
        # 处理确认删除对话框
        time.sleep(0.5)
        from .common_helper import handle_modal_confirm
        handle_modal_confirm(mini, "删除")
        print('   ✅ 已确认删除')
        
        # 等待删除操作完成
        time.sleep(1.5)
        
        # 步骤6: 验证删除成功 - 朋友圈已从列表中移除
        page = mini.app.current_page
        circles_after = page.data.get('circles', [])
        circles_after_count = len(circles_after)
        
        print(f'   ℹ️  删除后朋友圈数: {circles_after_count}')
        
        # 验证数量是否减少1
        if circles_after_count != circles_before - 1:
            return {
                'success': False,
                'circle_id': circle_id,
                'circle_name': circle_name,
                'message': f'删除后朋友圈数量异常: 预期 {circles_before - 1}，实际 {circles_after_count}'
            }
        
        # 验证目标朋友圈是否已不存在
        for circle in circles_after:
            cid = circle.get('_id') or circle.get('id')
            if cid == circle_id:
                return {
                    'success': False,
                    'circle_id': circle_id,
                    'circle_name': circle_name,
                    'message': f'删除后朋友圈 {circle_name} 仍在列表中'
                }
        
        print(f'   ✅ 朋友圈已从列表中移除')
        print(f'   ✅ 删除成功: {circle_name} ({circle_id[:8]}...)')
        
        return {
            'success': True,
            'circle_id': circle_id,
            'circle_name': circle_name,
            'message': f'成功删除朋友圈: {circle_name}'
        }
        
    except Exception as e:
        print(f'❌ 删除朋友圈失败: {str(e)}')
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'circle_id': circle_id,
            'circle_name': '',
            'message': f'删除时发生异常: {str(e)}'
        }