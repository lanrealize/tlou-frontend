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
            js_get_latest = '''
            function getLatestCircleFromUser() {
                try {
                    const app = getApp();
                    const userStore = app.getUserStore();
                    
                    if (userStore && userStore.userInfo && userStore.userInfo.circles) {
                        const circles = userStore.userInfo.circles;
                        if (circles.length > 0) {
                            const latest = circles[circles.length - 1];
                            return { 
                                success: true, 
                                circleId: latest._id || latest.id,
                                circleCount: circles.length
                            };
                        }
                    }
                    
                    return { success: false, reason: 'no_circles_in_user_info' };
                } catch (e) {
                    return { success: false, reason: e.message };
                }
            }
            '''
            
            result = mini.app.evaluate(js_get_latest.strip(), sync=True)
            user_data = result.get('result', {}).get('result', {})
            
            if user_data.get('success'):
                circle_id = user_data.get('circleId')
                print(f'   ✅ 从用户信息获得朋友圈ID: {circle_id[:8]}... (用户共有{user_data.get("circleCount")}个朋友圈)')
            else:
                print(f'   ⚠️  从用户信息获取失败: {user_data.get("reason")}')
        
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

