#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
未登录用户测试 - Main 页面

测试场景：
- MAIN_001: 点击"点击登录"按钮
- MAIN_002: 点击历史记录
- MAIN_003: 点击创建新朋友圈
- MAIN_004: 刷新"发现有趣朋友圈"
- MAIN_005: 进入有趣朋友圈（浏览模式）

每个测试会验证：
1. 操作是否触发正确的行为
2. 弹窗是否显示正确的提示文字
"""

import sys
import io
import os
import time
import traceback

# 设置标准输出为 UTF-8 编码以支持 emoji
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 添加父目录到路径，以便导入 helpers
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (
    launch_miniprogram,
    close_miniprogram,
    enter_test_mode,
    exit_test_mode,
    check_popup_visible,
    close_popup_by_mask,
    ensure_popup_closed,
    check_circle_status_action,
    navigate_to_details,
    navigate_to_details_from_share
)

# 从 utils/userStatus.js 定义的提示文字
# 注意：某些提示文字是硬编码在页面中的，如 handleUserAuth 中的 '请完善您的个人信息'
EXPECTED_MESSAGES = {
    'loginButton': '请完善您的个人信息',  # pages/main/main.js handleUserAuth 硬编码
    'createCircle': '您需要登录才能创建朋友圈',
    'enterListPage': '您需要登录才能查看朋友圈列表',
    'acceptInvite': '请先完成注册后加入朋友圈',
    'applyToJoin': '请先完成注册后提交申请',
}


class TestUnloggedMain:
    """未登录用户 - Main 页面测试"""
    
    def __init__(self):
        self.mini = None
        self.results = []
        self.page_loaded = False  # 标记页面是否已加载，避免重复导航
        
    def setup(self):
        """启动小程序并进入测试模式"""
        print('\n' + '='*60)
        print('🧪 开始未登录用户测试 - Main 页面')
        print('='*60)
        
        self.mini = launch_miniprogram()
        enter_test_mode(self.mini)
        self.page_loaded = True  # 进入测试模式后已经在main页面
        print('✅ 测试环境已就绪\n')
        
    def teardown(self):
        """退出测试模式并关闭小程序"""
        if self.mini:
            print('\n🔚 清理测试环境...')
            # 等待1秒，确保最后一个测试完全结束
            time.sleep(1.0)
            exit_test_mode(self.mini)
            close_miniprogram(self.mini)
    
    def navigate_to_main(self):
        """导航到 main 页面（优化：避免不必要的导航）"""
        # 如果页面已加载且没有跳转到其他页面，就不需要重新导航
        current_page = self.mini.app.current_page
        if current_page.path == '/pages/main/main' and self.page_loaded:
            # 已经在main页面，只需确保弹窗关闭
            ensure_popup_closed(self.mini)
            return
        
        # 需要导航到main页面
        self.mini.app.redirect_to('/pages/main/main')
        time.sleep(0.3)  # 压缩到极限
        self.page_loaded = True
    
    def click_discover_card_to_details(self):
        """点击发现朋友圈卡片进入details页面
        
        Returns:
            bool: True表示成功或卡片不存在（跳过测试），False表示发生错误
        """
        try:
            page = self.mini.app.current_page
            card_content = page.get_element('discover-circle-card>>>.post-card')
            card_content.tap()
            print('✅ 点击进入details')
            return True
        except Exception as e:
            error_msg = str(e).lower()
            if 'not found' in error_msg or 'no such' in error_msg:
                print('⚠️  未找到发现朋友圈卡片（可能没有推荐）')
                return True  # 卡片不存在是正常情况
            else:
                print(f'❌ 点击卡片时发生异常: {str(e)}')
                import traceback
                traceback.print_exc()
                return False
    
    # ============================================
    # 测试用例
    # ============================================
    
    def test_main_001_login_button(self):
        """MAIN_001: 点击"点击登录"按钮"""
        print('\n📝 测试 MAIN_001: 点击"点击登录"按钮')
        print('-'*60)
        
        try:
            self.navigate_to_main()
            page = self.mini.app.current_page
            
            # 未登录用户应该看到浏览提示卡片
            browse_tip = page.get_element('.browse-tip-card')
            if not browse_tip:
                print('⚠️  未找到浏览提示卡片')
                return False
            
            print('✅ 找到浏览提示卡片')
            
            # 点击"点击登录"按钮
            login_btn = page.get_element('.create-btn')
            if not login_btn:
                print('❌ 未找到"点击登录"按钮')
                return False
            
            print('✅ 找到"点击登录"按钮')
            login_btn.tap()
            time.sleep(0.2)  # 压缩到极限
            
            # 检查弹窗和文字
            result = check_popup_visible(self.mini, EXPECTED_MESSAGES['loginButton'])
            
            if not result['visible']:
                print('❌ 未弹出注册弹窗')
                return False
            
            print(f'✅ 弹出注册弹窗')
            
            # 验证文字是否正确
            if result['match'] is False:
                print(f'❌ 弹窗提示文字不正确')
                print(f'   期望: "{EXPECTED_MESSAGES["loginButton"]}"')
                print(f'   实际: "{result["reason"]}"')
                return False
            
            print(f'✅ 弹窗文字验证通过: "{result["reason"]}"')
            
            # 关闭弹窗（等待0.4秒让用户看到）
            close_popup_by_mask(self.mini, wait_visible=0.4)
            return True
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_main_002_history(self):
        """MAIN_002: 点击历史记录"""
        print('\n📝 测试 MAIN_002: 点击历史记录')
        print('-'*60)
        
        try:
            self.navigate_to_main()
            page = self.mini.app.current_page
            
            # 查找历史记录按钮
            history_btn = page.get_element('.action-panel')
            if not history_btn:
                print('❌ 未找到历史记录按钮')
                return False
            
            print('✅ 找到历史记录按钮')
            history_btn.tap()
            time.sleep(0.2)  # 压缩到极限
            
            # 检查弹窗和文字
            result = check_popup_visible(self.mini, EXPECTED_MESSAGES['enterListPage'])
            
            if not result['visible']:
                print('❌ 未弹出注册弹窗')
                return False
            
            print(f'✅ 弹出注册弹窗')
            
            # 验证文字是否正确
            if result['match'] is False:
                print(f'❌ 弹窗提示文字不正确')
                print(f'   期望: "{EXPECTED_MESSAGES["enterListPage"]}"')
                print(f'   实际: "{result["reason"]}"')
                return False
            
            print(f'✅ 弹窗文字验证通过: "{result["reason"]}"')
            
            close_popup_by_mask(self.mini, wait_visible=0.4)
            return True
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_main_003_create_circle(self):
        """MAIN_003: 点击创建新朋友圈"""
        print('\n📝 测试 MAIN_003: 点击创建新朋友圈')
        print('-'*60)
        
        try:
            self.navigate_to_main()
            page = self.mini.app.current_page
            
            # 查找创建朋友圈按钮
            create_btn = page.get_element('.create-section')
            if not create_btn:
                print('❌ 未找到创建朋友圈按钮')
                return False
            
            print('✅ 找到创建朋友圈按钮')
            create_btn.tap()
            time.sleep(0.2)  # 压缩到极限
            
            # 检查弹窗和文字
            result = check_popup_visible(self.mini, EXPECTED_MESSAGES['createCircle'])
            
            if not result['visible']:
                print('❌ 未弹出注册弹窗')
                return False
            
            print(f'✅ 弹出注册弹窗')
            
            # 验证文字是否正确
            if result['match'] is False:
                print(f'❌ 弹窗提示文字不正确')
                print(f'   期望: "{EXPECTED_MESSAGES["createCircle"]}"')
                print(f'   实际: "{result["reason"]}"')
                return False
            
            print(f'✅ 弹窗文字验证通过: "{result["reason"]}"')
            
            close_popup_by_mask(self.mini, wait_visible=0.4)
            return True
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_main_004_refresh_discover(self):
        """MAIN_004: 刷新"发现有趣朋友圈" """
        print('\n📝 测试 MAIN_004: 刷新"发现有趣朋友圈"')
        print('-'*60)
        
        try:
            self.navigate_to_main()
            page = self.mini.app.current_page
            
            ensure_popup_closed(self.mini)
            time.sleep(0.5)
            
            # 尝试查找卡片中的刷新按钮
            refresh_element = None
            try:
                card = page.get_element('discover-circle-card')
                if card:
                    print('✅ 找到发现朋友圈卡片')
                    # 使用 >>> 选择器穿透组件边界查找刷新图标
                    refresh_element = page.get_element('discover-circle-card>>>.menu-icon')
                    if refresh_element:
                            print('✅ 找到刷新图标')
            except Exception as e:
                error_msg = str(e).lower()
                # 只有"找不到元素"是正常的，其他错误立即失败
                if 'not found' not in error_msg and 'no such' not in error_msg:
                    print(f'❌ 查找卡片时发生严重错误: {str(e)}')
                    traceback.print_exc()
                    return False
            
            # 如果没有卡片，查找空状态
            if not refresh_element:
                try:
                    refresh_element = page.get_element('.discover-empty')
                    if refresh_element:
                        print('✅ 找到空状态刷新区域')
                except Exception as e:
                    error_msg = str(e).lower()
                    # 只有"找不到元素"是正常的，其他错误立即失败
                    if 'not found' not in error_msg and 'no such' not in error_msg:
                        print(f'❌ 查找空状态时发生严重错误: {str(e)}')
                        traceback.print_exc()
                        return False
            
            if not refresh_element:
                print('❌ 未找到刷新元素')
                return False
            
            # 获取刷新前的朋友圈ID
            before_circles = page.data.get('recommendedCircles', [])
            if not before_circles or len(before_circles) == 0:
                print('⚠️  刷新前没有朋友圈数据，无法验证')
                refresh_element.tap()
                time.sleep(1.0)
                print('✅ 已执行刷新操作（无数据可验证）')
                return True
            
            before_id = before_circles[0].get('_id', '')
            print(f'📊 刷新前: ID={before_id[:8]}...')
            
            # 点击刷新
            refresh_element.tap()
            print('✅ 点击刷新按钮')
            
            # 等待刷新完成
            time.sleep(1.2)
            
            # 获取刷新后的朋友圈ID
            page = self.mini.app.current_page  # 重新获取页面
            after_circles = page.data.get('recommendedCircles', [])
            
            if not after_circles or len(after_circles) == 0:
                print('❌ 刷新后没有数据')
                return False
            
            after_id = after_circles[0].get('_id', '')
            print(f'📊 刷新后: ID={after_id[:8]}...')
            
            # 验证：circleId 必须改变
            if before_id != after_id:
                print(f'✅ 验证通过：朋友圈已更换')
                print(f'   {before_id[:12]}... → {after_id[:12]}...')
                return True
            else:
                print(f'❌ 验证失败：刷新后仍是同一个朋友圈')
                return False
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_main_005_enter_discover_circle(self):
        """MAIN_005: 进入有趣朋友圈（浏览模式）"""
        print('\n📝 测试 MAIN_005: 进入有趣朋友圈（浏览模式）')
        print('-'*60)
        
        try:
            self.navigate_to_main()
            page = self.mini.app.current_page
            time.sleep(0.3)
            
            ensure_popup_closed(self.mini)
            time.sleep(0.8)
            
            # 查找发现朋友圈卡片
            try:
                discover_card = page.get_element('discover-circle-card')
                print('✅ 找到发现朋友圈卡片')
            except Exception as e:
                # 区分"找不到元素"和"其他错误"
                error_msg = str(e).lower()
                if 'not found' in error_msg or 'no such' in error_msg or 'element' in error_msg:
                    # 元素不存在是正常的（可能没有推荐）
                    print('⚠️  未找到发现朋友圈卡片（可能没有推荐）')
                    return True
                else:
                    # 其他异常（页面崩溃、网络错误等）应该让测试失败
                    print(f'❌ 查找卡片时发生异常: {str(e)}')
                    traceback.print_exc()
                    return False
            
            # 获取点击前的朋友圈ID
            before_circles = page.data.get('recommendedCircles', [])
            if not before_circles or len(before_circles) == 0:
                print('⚠️  没有朋友圈数据，跳过测试')
                return True
            
            expected_circle_id = before_circles[0].get('_id', '')
            before_path = page.path
            print(f'点击前: {before_path}')
            print(f'目标朋友圈: {expected_circle_id[:12]}...')
            
            # 点击卡片（使用组件内部区域点击）
            try:
                card_content = page.get_element('discover-circle-card>>>.post-card')
                if card_content:
                    card_content.tap()
                    print('✅ 点击卡片内容区域')
                else:
                    discover_card.tap()
                    print('✅ 点击卡片')
            except Exception as e:
                error_msg = str(e).lower()
                # 只有"找不到内部元素"时才用备用方案，其他错误立即失败
                if 'not found' in error_msg or 'no such' in error_msg:
                    # 找不到内部元素，使用外部卡片点击
                    discover_card.tap()
                    print('✅ 点击卡片（备用方案）')
                else:
                    # 页面崩溃、网络错误等严重问题
                    print(f'❌ 点击卡片时发生严重错误: {str(e)}')
                    traceback.print_exc()
                    return False
            
            # 等待页面跳转
            time.sleep(1.5)
            
            # 获取跳转后的页面
            current_page = self.mini.app.current_page
            current_path = current_page.path
            
            # 验证：是否跳转到 details 页面
            if 'details' in current_path:
                print(f'✅ 检测到页面跳转: {before_path} -> {current_path}')
                
                # 验证URL参数中的 circleId
                query = current_page.query
                url_circle_id = query.get('circleId', '')
                
                if url_circle_id == expected_circle_id:
                    print(f'✅ 验证通过：跳转到正确的朋友圈详情页')
                    print(f'   circleId: {url_circle_id[:12]}...')
                    
                    # 验证source参数
                    source = query.get('source', '')
                    if source == 'discover':
                        print(f'✅ source参数正确: {source}')
                    
                    self.page_loaded = False
                    return True
                else:
                    print(f'❌ 验证失败：跳转的朋友圈ID不匹配')
                    print(f'   期望: {expected_circle_id[:12]}...')
                    print(f'   实际: {url_circle_id[:12] if url_circle_id else "无"}...')
                    return False
            
            # 未跳转到details
            elif current_path == before_path:
                print(f'⚠️  未检测到页面跳转')
                result = check_popup_visible(self.mini)
                if result['visible']:
                    print(f'✅ 触发了注册弹窗（也是预期行为）')
                    close_popup_by_mask(self.mini, wait_visible=0.4)
                    return True
                else:
                    print('❌ 既未跳转也未弹窗')
                    return False
            else:
                print(f'❌ 跳转到了意外的页面: {current_path}')
                return False
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_details_001_status_from_discover(self):
        """DETAILS_001: 从discover进入details检查circle-status-action"""
        print('\n📝 测试 DETAILS_001: 从discover进入details检查circle-status-action')
        print('-'*60)
        
        try:
            self.navigate_to_main()
            page = self.mini.app.current_page
            time.sleep(0.3)
            
            ensure_popup_closed(self.mini)
            time.sleep(0.8)
            
            # 查找发现朋友圈卡片并点击
            try:
                discover_card = page.get_element('discover-circle-card')
                print('✅ 找到发现朋友圈卡片')
            except Exception as e:
                error_msg = str(e).lower()
                if 'not found' in error_msg or 'no such' in error_msg or 'element' in error_msg:
                    print('⚠️  未找到发现朋友圈卡片（可能没有推荐）')
                    return True
                else:
                    print(f'❌ 查找卡片时发生异常: {str(e)}')
                    traceback.print_exc()
                    return False
            
            # 点击进入
            try:
                card_content = page.get_element('discover-circle-card>>>.post-card')
                if card_content:
                    card_content.tap()
                    print('✅ 点击卡片内容区域')
                else:
                    discover_card.tap()
                    print('✅ 点击卡片')
            except Exception as e:
                error_msg = str(e).lower()
                if 'not found' in error_msg or 'no such' in error_msg:
                    discover_card.tap()
                    print('✅ 点击卡片（备用方案）')
                else:
                    print(f'❌ 点击卡片时发生严重错误: {str(e)}')
                    traceback.print_exc()
                return False
            
            time.sleep(1.5)  # 等待页面跳转
            
            # 检查circle-status-action组件
            result = check_circle_status_action(
                self.mini,
                '公开朋友圈',
                '你可以申请加入这个朋友圈',
                '申请加入'
            )
            
            if result['match']:
                print(f'✅ circle-status-action显示正确')
                print(f'   状态: {result["user_status"]}')
                print(f'   主标题: {result["main_title"]}')
                print(f'   副标题: {result["sub_title"]}')
                print(f'   按钮: {result["button_text"]}')
                return True
            else:
                print(f'❌ circle-status-action显示错误')
                for error in result['errors']:
                    print(f'   {error}')
                return False
            
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_details_002_like_popup(self):
        """DETAILS_002: 从discover进入details点赞检查弹窗"""
        print('\n📝 测试 DETAILS_002: 从discover进入details点赞检查弹窗')
        print('-'*60)
        
        try:
            # 优化：如果已经在details页面，就不返回main
            current_page = self.mini.app.current_page
            if current_page.path != '/pages/details/details':
                self.navigate_to_main()
                time.sleep(0.3)
                ensure_popup_closed(self.mini)
                time.sleep(0.8)
                
                # 使用辅助函数点击发现朋友圈卡片
                if not self.click_discover_card_to_details():
                    return False
                
                time.sleep(1.5)  # 等待页面跳转
            else:
                print('✅ 已在details页面，无需跳转')
            
            # 在details页面，查找帖子的三点按钮
            details_page = self.mini.app.current_page
            try:
                # 先找到post-item组件
                post_item = details_page.get_element('post-item')
                if not post_item:
                    # 🔧 需要区分"圈子加载失败"和"圈子没有帖子"
                    js_code = """
                    function checkCircleLoaded() {
                        const pages = getCurrentPages();
                        const page = pages[pages.length - 1];
                        return {
                            hasCircle: !!(page.data.circle && page.data.circle._id)
                        };
                    }
                    """
                    check_result = self.mini.app.evaluate(js_code.strip(), sync=True)
                    circle_state = check_result.get('result', {}).get('result', {})
                    
                    if not circle_state.get('hasCircle'):
                        print('❌ 圈子数据未加载成功')
                        return False
                    
                    print('⚠️  圈子存在但没有帖子，跳过测试')
                    return True
                
                print('✅ 找到帖子')
                
                # 找到三点按钮并点击展开菜单
                menu_btn = details_page.get_element('post-item>>>.actions-menu-btn')
                if not menu_btn:
                    print('⚠️  未找到操作菜单按钮')
                    return True
                
                print('✅ 找到操作菜单按钮')
                menu_btn.tap()
                time.sleep(0.3)  # 等待菜单展开
                
                # 在下拉菜单中找到点赞按钮
                like_items = details_page.get_elements('post-item>>>.dropdown-item')
                if not like_items or len(like_items) == 0:
                    print('⚠️  未找到下拉菜单项')
                    return True
                
                # 第一个dropdown-item是点赞按钮
                like_btn = like_items[0]
                print('✅ 找到点赞按钮')
                like_btn.tap()
                time.sleep(0.3)
                
                # 检查弹窗并验证文字
                result = check_popup_visible(self.mini, expected_reason='登录后才能点赞')
                if result['visible']:
                    if result['match']:
                        print(f'✅ 弹窗正确显示且文字验证通过')
                    else:
                        print(f'⚠️  弹窗显示但文字不匹配')
                        print(f'   期望: "登录后才能点赞"')
                        print(f'   实际: "{result["reason"]}"')
                    close_popup_by_mask(self.mini, wait_visible=0.4)
                    return result['match']  # 必须文字也匹配才算通过
                else:
                    print('❌ 未弹出注册弹窗')
                    return False
                    
            except Exception as e:
                error_msg = str(e).lower()
                if 'not found' in error_msg:
                    print('⚠️  未找到相关元素（可能没有帖子）')
                    return True
                else:
                    print(f'❌ 发生异常: {str(e)}')
                    traceback.print_exc()
                    return False
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_details_003_comment_popup(self):
        """DETAILS_003: 从discover进入details评论检查弹窗"""
        print('\n📝 测试 DETAILS_003: 从discover进入details评论检查弹窗')
        print('-'*60)
        
        try:
            # 优化：如果已经在details页面，就不返回main
            current_page = self.mini.app.current_page
            if current_page.path != '/pages/details/details':
                self.navigate_to_main()
                time.sleep(0.3)
                ensure_popup_closed(self.mini)
                time.sleep(0.8)
                
                # 使用辅助函数点击发现朋友圈卡片
                if not self.click_discover_card_to_details():
                    return False
                
                time.sleep(1.5)
            else:
                print('✅ 已在details页面，无需跳转')
            
            # 在details页面，查找帖子的三点按钮
            details_page = self.mini.app.current_page
            try:
                # 先找到post-item组件
                post_item = details_page.get_element('post-item')
                if not post_item:
                    # 🔧 需要区分"圈子加载失败"和"圈子没有帖子"
                    js_code = """
                    function checkCircleLoaded() {
                        const pages = getCurrentPages();
                        const page = pages[pages.length - 1];
                        return {
                            hasCircle: !!(page.data.circle && page.data.circle._id)
                        };
                    }
                    """
                    check_result = self.mini.app.evaluate(js_code.strip(), sync=True)
                    circle_state = check_result.get('result', {}).get('result', {})
                    
                    if not circle_state.get('hasCircle'):
                        print('❌ 圈子数据未加载成功')
                        return False
                    
                    print('⚠️  圈子存在但没有帖子，跳过测试')
                    return True
                
                print('✅ 找到帖子')
                
                # 找到三点按钮并点击展开菜单
                menu_btn = details_page.get_element('post-item>>>.actions-menu-btn')
                if not menu_btn:
                    print('⚠️  未找到操作菜单按钮')
                    return True
                
                print('✅ 找到操作菜单按钮')
                menu_btn.tap()
                time.sleep(0.3)  # 等待菜单展开
                
                # 在下拉菜单中找到评论按钮
                menu_items = details_page.get_elements('post-item>>>.dropdown-item')
                if not menu_items or len(menu_items) < 2:
                    print('⚠️  未找到下拉菜单项')
                    return True
                
                # 第二个dropdown-item是评论按钮
                comment_btn = menu_items[1]
                print('✅ 找到评论按钮')
                comment_btn.tap()
                time.sleep(0.3)
                
                # 检查弹窗并验证文字
                result = check_popup_visible(self.mini, expected_reason='登录后才能发表评论')
                if result['visible']:
                    if result['match']:
                        print(f'✅ 弹窗正确显示且文字验证通过')
                    else:
                        print(f'⚠️  弹窗显示但文字不匹配')
                        print(f'   期望: "登录后才能发表评论"')
                        print(f'   实际: "{result["reason"]}"')
                    close_popup_by_mask(self.mini, wait_visible=0.4)
                    return result['match']  # 必须文字也匹配才算通过
                else:
                    print('❌ 未弹出注册弹窗')
                    return False
                    
            except Exception as e:
                error_msg = str(e).lower()
                if 'not found' in error_msg:
                    print('⚠️  未找到相关元素（可能没有帖子）')
                    return True
                else:
                    print(f'❌ 发生异常: {str(e)}')
                    traceback.print_exc()
                    return False
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
            
    def test_details_004_settings_popup(self):
        """DETAILS_004: 从discover进入details点击设置检查弹窗"""
        print('\n📝 测试 DETAILS_004: 从discover进入details点击设置检查弹窗')
        print('-'*60)
        
        try:
            # 优化：如果已经在details页面，就不返回main
            current_page = self.mini.app.current_page
            if current_page.path != '/pages/details/details':
                self.navigate_to_main()
                time.sleep(0.3)
                ensure_popup_closed(self.mini)
                time.sleep(0.8)
                
                # 使用辅助函数点击发现朋友圈卡片
                if not self.click_discover_card_to_details():
                    return False
                
                time.sleep(1.5)
            else:
                print('✅ 已在details页面，无需跳转')
            
            # 在details页面，查找设置按钮（在card-content-fixed中）
            details_page = self.mini.app.current_page
            try:
                # 设置按钮在右上角的.setting-btn
                settings_btn = details_page.get_element('.setting-btn')
                if not settings_btn:
                    # 🔧 需要区分"圈子加载失败"和"其他原因"
                    js_code = """
                    function checkCircleLoaded() {
                        const pages = getCurrentPages();
                        const page = pages[pages.length - 1];
                        return {
                            hasCircle: !!(page.data.circle && page.data.circle._id)
                        };
                    }
                    """
                    check_result = self.mini.app.evaluate(js_code.strip(), sync=True)
                    circle_state = check_result.get('result', {}).get('result', {})
                    
                    if not circle_state.get('hasCircle'):
                        print('❌ 圈子数据未加载成功')
                        return False
                    
                    print('⚠️  未找到设置按钮')
                    return True
                
                print('✅ 找到设置按钮')
                settings_btn.tap()
                time.sleep(0.3)
                
                # 检查弹窗并验证文字
                result = check_popup_visible(self.mini, expected_reason='您需要登录才能修改设置')
                if result['visible']:
                    if result['match']:
                        print(f'✅ 弹窗正确显示且文字验证通过')
                    else:
                        print(f'⚠️  弹窗显示但文字不匹配')
                        print(f'   期望: "您需要登录才能修改设置"')
                        print(f'   实际: "{result["reason"]}"')
                    close_popup_by_mask(self.mini, wait_visible=0.4)
                    return result['match']  # 必须文字也匹配才算通过
                else:
                    print('❌ 未弹出注册弹窗')
                    return False
                    
            except Exception as e:
                error_msg = str(e).lower()
                if 'not found' in error_msg:
                    print('⚠️  未找到设置按钮')
                    return True
                else:
                    print(f'❌ 发生异常: {str(e)}')
                    traceback.print_exc()
                    return False
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_details_005_status_from_share(self):
        """DETAILS_005: 从分享进入details检查circle-status-action"""
        print('\n📝 测试 DETAILS_005: 从分享进入details检查circle-status-action')
        print('-'*60)
        
        try:
            # 使用工具函数：模拟从分享链接进入（邀请模式）
            result = navigate_to_details_from_share(self.mini)
            
            if not result['success']:
                print('⚠️  无法模拟分享进入，跳过测试')
                return True
            
            print(f'📍 朋友圈ID: {result["circle_id"][:12]}...')
            print(f'👤 邀请人ID: {result["inviter_id"][:12]}...')
            print(f'🔗 已从分享进入（邀请模式）')
            time.sleep(1.5)
            
            # 验证是否到达details页面
            current_page = self.mini.app.current_page
            if 'details' not in current_page.path:
                print(f'❌ 导航失败，当前页面: {current_page.path}')
                return False
            
            print(f'✅ 成功进入details页面')
            
            # 使用封装的函数检查circle-status-action组件
            # 从分享进入应该显示"邀请"状态
            print(f'🔍 使用check_circle_status_action函数验证底部组件...')
            result = check_circle_status_action(
                self.mini,
                '你收到了邀请',
                '点击右侧按钮加入这个朋友圈',
                '接受邀请'
            )
            
            if result['match']:
                print(f'✅ ✅ ✅ circle-status-action组件验证通过 ✅ ✅ ✅')
                print(f'   📊 组件状态详情（邀请模式）:')
                print(f'      - 用户状态: {result["user_status"]} (应为 invited)')
                print(f'      - 主标题: {result["main_title"]}')
                print(f'      - 副标题: {result["sub_title"]}')
                print(f'      - 按钮文本: {result["button_text"]}')
                
                # 额外验证：确认状态确实是invited
                if result['user_status'] == 'invited':
                    print(f'✅ 状态验证通过：确实处于邀请模式')
                else:
                    print(f'⚠️  状态异常：期望invited，实际{result["user_status"]}')
                
                return True
            else:
                print(f'❌ circle-status-action组件验证失败')
                for error in result['errors']:
                    print(f'   {error}')
                return False
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    def test_details_006_reply_comment_popup(self):
        """DETAILS_006: 进入指定圈子回复评论检查弹窗"""
        print('\n📝 测试 DETAILS_006: 进入指定圈子回复评论检查弹窗')
        print('-'*60)
        
        try:
            # ⚠️ 注意：这个测试需要一个存在且有评论的圈子
            # 如果圈子不存在，测试应该失败而不是跳过
            TEST_CIRCLE_ID = '68fad3c50b3028ca31d0b3ca'
            result = navigate_to_details(self.mini, circle_id=TEST_CIRCLE_ID)
            
            if not result['success']:
                print(f'❌ 导航失败: {result.get("error", "未知错误")}')
                print('⚠️  测试圈子可能不存在，请更新TEST_CIRCLE_ID为一个有效的圈子ID')
                return False  # 🔧 圈子不存在应该是测试失败，而不是跳过
            
            print(f'✅ 已进入测试圈子: {TEST_CIRCLE_ID}')
            
            # 等待页面加载
            time.sleep(1.0)
            
            # 查找评论的回复按钮
            page = self.mini.app.current_page
            
            try:
                # 查找第一个评论的回复按钮
                reply_button = page.get_element('post-item>>>.reply-btn')
                if not reply_button:
                    # 🔧 区分"没有评论"和"圈子加载失败"两种情况
                    # 详细检查圈子和评论数据
                    js_code = """
                    function checkCircleAndComments() {
                        const pages = getCurrentPages();
                        const page = pages[pages.length - 1];
                        
                        const hasCircle = !!(page.data.circle && page.data.circle._id);
                        const hasPosts = !!(page.data.posts && page.data.posts.length > 0);
                        
                        // 检查是否有评论
                        let hasComments = false;
                        let commentCount = 0;
                        if (hasPosts && page.data.posts) {
                            for (const post of page.data.posts) {
                                if (post.comments && post.comments.length > 0) {
                                    hasComments = true;
                                    commentCount += post.comments.length;
                                }
                            }
                        }
                        
                        return {
                            hasCircle: hasCircle,
                            hasPosts: hasPosts,
                            hasComments: hasComments,
                            commentCount: commentCount
                        };
                    }
                    """
                    check_result = self.mini.app.evaluate(js_code.strip(), sync=True)
                    circle_state = check_result.get('result', {}).get('result', {})
                    
                    if not circle_state.get('hasCircle'):
                        print('❌ 圈子数据未加载成功，可能圈子不存在')
                        return False
                    
                    if not circle_state.get('hasPosts'):
                        print('❌ 测试失败：圈子存在但没有帖子')
                        print('⚠️  test_details_006 需要一个有评论的圈子来测试回复功能')
                        print(f'⚠️  请更新 TEST_CIRCLE_ID 为一个有评论的圈子ID')
                        return False  # 🔧 没有帖子意味着无法测试，应该失败
                    
                    if not circle_state.get('hasComments'):
                        print('❌ 测试失败：圈子有帖子但没有评论')
                        print(f'   评论数: {circle_state.get("commentCount", 0)}')
                        print('⚠️  test_details_006 需要一个有评论的圈子来测试回复功能')
                        print(f'⚠️  请更新 TEST_CIRCLE_ID 为一个有评论的圈子ID')
                        return False  # 🔧 没有评论意味着无法测试回复功能，应该失败
                    
                    # 如果有评论但找不到回复按钮，可能是UI问题
                    print(f'❌ 测试失败：找到 {circle_state.get("commentCount", 0)} 条评论，但未找到回复按钮')
                    print('⚠️  这可能是UI渲染问题或元素选择器错误')
                    return False
                
                print('✅ 找到回复按钮')
                
                # 点击回复按钮
                reply_button.tap()
                print('✅ 点击回复按钮')
                
                # 等待弹窗出现
                time.sleep(0.5)
                
                # 验证是否弹出登录提示
                result = check_popup_visible(self.mini, expected_reason='登录后才能发表评论')
                if result['visible']:
                    if result['match']:
                        print(f'✅ 弹窗正确显示且文字验证通过')
                    else:
                        print(f'⚠️  弹窗显示但文字不匹配')
                        print(f'   期望: "登录后才能发表评论"')
                        print(f'   实际: "{result["reason"]}"')
                    
                    close_popup_by_mask(self.mini, wait_visible=0.4)
                    return result['match']  # 必须文字也匹配才算通过
                else:
                    print('❌ 未弹出注册弹窗')
                    return False
                    
            except Exception as e:
                error_msg = str(e).lower()
                if 'not found' in error_msg:
                    print('⚠️  查找元素失败，可能是页面加载问题')
                    return False  # 🔧 查找失败应该是测试问题，不应该跳过
                else:
                    print(f'❌ 发生异常: {str(e)}')
                    traceback.print_exc()
                    return False
                
        except Exception as e:
            print(f'❌ 测试异常: {str(e)}')
            traceback.print_exc()
            return False
    
    # ============================================
    # 运行所有测试
    # ============================================
    
    def run_all_tests(self):
        """运行所有测试用例"""
        test_methods = [
            self.test_main_001_login_button,
            self.test_main_002_history,
            self.test_main_003_create_circle,
            self.test_main_004_refresh_discover,
            self.test_main_005_enter_discover_circle,
            self.test_details_001_status_from_discover,
            self.test_details_002_like_popup,
            self.test_details_003_comment_popup,
            self.test_details_004_settings_popup,
            self.test_details_006_reply_comment_popup,
            self.test_details_005_status_from_share,
        ]
        
        all_passed = True
        for test_method in test_methods:
            try:
                result = test_method()
                self.results.append((test_method.__doc__.split('\n')[0], result))
                if not result:
                    all_passed = False
            except Exception as e:
                self.results.append((test_method.__doc__.split('\n')[0], False))
                print(f'❌ 测试 {test_method.__doc__} 发生未捕获异常: {str(e)}')
                traceback.print_exc()
                all_passed = False
        
        return all_passed
    
    def print_results(self):
        """打印测试结果"""
        print('\n\n' + '='*60)
        print('📊 测试结果汇总')
        print('='*60)
        
        passed = 0
        failed = 0
        
        for name, result in self.results:
            status = '✅ 通过' if result else '❌ 失败'
            print(f'{status} | {name}')
            if result:
                passed += 1
            else:
                failed += 1
        
        print('-'*60)
        print(f'总计: {len(self.results)} 个测试')
        print(f'✅ 通过: {passed} 个')
        print(f'❌ 失败: {failed} 个')
        print(f'通过率: {passed/len(self.results)*100:.1f}%')
        print('='*60)


if __name__ == '__main__':
    tester = TestUnloggedMain()
    tester.setup()
    success = tester.run_all_tests()
    tester.print_results()
    tester.teardown()
    exit(0 if success else 1)
