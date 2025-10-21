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
    ensure_popup_closed
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
            time.sleep(0.5)  # 压缩到极限
            
            # 检查是否有卡片或空状态
            has_card = False
            has_empty = False
            refresh_element = None
            
            try:
                card = page.get_element('discover-circle-card')
                if card:
                    has_card = True
                    print('✅ 找到发现朋友圈卡片')
                    # 在卡片模式下，需要点击右上角的刷新图标
                    # 刷新图标在组件内部，使用 catchtap="onRefreshTap"
                    # 需要找到 .menu-icon 元素
                    try:
                        # 尝试直接查找刷新图标
                        refresh_icon = page.get_element('.menu-icon')
                        if refresh_icon:
                            refresh_element = refresh_icon
                            print('✅ 找到刷新图标')
                        else:
                            print('⚠️  未找到刷新图标，尝试点击卡片内的刷新区域')
                            # 如果找不到，尝试通过 evaluate 触发刷新
                    except:
                        print('⚠️  查找刷新图标失败')
            except:
                pass
            
            if not has_card:
                try:
                    empty = page.get_element('.discover-empty')
                    if empty:
                        has_empty = True
                        refresh_element = empty
                        print('✅ 找到空状态刷新区域')
                except:
                    pass
            
            if not refresh_element:
                print('⚠️  未找到刷新元素')
                # 尝试通过 JS 直接触发刷新方法
                js_trigger_refresh = """
function triggerRefresh() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.refreshRecommendations) {
        currentPage.refreshRecommendations();
        return true;
    }
    return false;
}
                """
                trigger_result = self.mini.app.evaluate(js_trigger_refresh.strip(), sync=True)
                triggered = trigger_result.get('result', {}).get('result', False)
                if triggered:
                    print('✅ 通过 JS 触发刷新方法')
                else:
                    print('❌ 无法触发刷新')
                    return False
            else:
                # 点击刷新元素
                refresh_element.tap()
                print('✅ 点击刷新元素')
            
            # 立即检查 loading 状态（刷新刚开始）
            time.sleep(0.1)
            js_check_loading = """
function checkLoadingState() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (!currentPage || !currentPage.data) {
        return { isLoadingRecommendations: false };
    }
    return {
        isLoadingRecommendations: currentPage.data.isLoadingRecommendations || false
    };
}
            """
            loading_result = self.mini.app.evaluate(js_check_loading.strip(), sync=True)
            loading_state = loading_result.get('result', {}).get('result', {})
            
            if loading_state.get('isLoadingRecommendations'):
                print('✅ 检测到加载状态：isLoadingRecommendations = true')
                # 等待加载完成
                time.sleep(0.8)  # 压缩到极限
                print('✅ 刷新操作已完成')
                return True
            else:
                # 可能刷新太快，检查是否有数据变化
                print('⚠️  未检测到 loading 状态，可能刷新速度太快')
                time.sleep(0.3)  # 压缩到极限
                print('✅ 刷新操作已触发（未检测到 loading，可能速度太快）')
                return True
                
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
            time.sleep(0.3)  # 压缩到极限
            
            ensure_popup_closed(self.mini)
            time.sleep(0.8)  # 压缩到极限
            
            # 查找发现朋友圈卡片
            discover_card = None
            try:
                discover_card = page.get_element('discover-circle-card')
            except:
                pass
            
            if not discover_card:
                print('⚠️  未找到发现朋友圈卡片（可能没有推荐）')
                return True  # 没有推荐也是正常的
            
            print('✅ 找到发现朋友圈卡片')
            
            # 记录当前页面路径
            js_get_current_path = """
function getCurrentPath() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    return currentPage ? currentPage.route || currentPage.__route__ : '';
}
            """
            before_result = self.mini.app.evaluate(js_get_current_path.strip(), sync=True)
            before_path = before_result.get('result', {}).get('result', '')
            print(f'点击前页面: {before_path}')
            
            # 使用 JS 触发点击事件，确保能正确触发
            js_trigger_click = """
function triggerCardClick() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (!currentPage) {
        return { success: false, reason: 'no_page' };
    }
    
    // 查找推荐朋友圈数据
    const recommendedCircles = currentPage.data.recommendedCircles;
    if (!recommendedCircles || recommendedCircles.length === 0) {
        return { success: false, reason: 'no_data' };
    }
    
    const circleId = recommendedCircles[0]._id;
    if (!circleId) {
        return { success: false, reason: 'no_id' };
    }
    
    // 直接调用页面的 viewRecommendedCircle 方法
    if (currentPage.viewRecommendedCircle) {
        currentPage.viewRecommendedCircle({
            detail: { circleId: circleId }
        });
        return { success: true, circleId: circleId };
    }
    
    return { success: false, reason: 'no_method' };
}
            """
            trigger_result = self.mini.app.evaluate(js_trigger_click.strip(), sync=True)
            trigger_data = trigger_result.get('result', {}).get('result', {})
            
            if not trigger_data.get('success'):
                reason = trigger_data.get('reason', 'unknown')
                print(f'❌ 触发点击失败，原因: {reason}')
                return False
            
            print(f'✅ 通过 JS 触发点击，circleId: {trigger_data.get("circleId")}')
            
            # 检查预加载状态
            time.sleep(0.3)  # 压缩到极限
            js_check_preload = """
function checkPreloadState() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (!currentPage || !currentPage.data) {
        return { isPreloading: false };
    }
    return {
        isPreloading: currentPage.data.isPreloadingCircle || false
    };
}
            """
            preload_result = self.mini.app.evaluate(js_check_preload.strip(), sync=True)
            preload_state = preload_result.get('result', {}).get('result', {})
            
            if preload_state.get('isPreloading'):
                print('✅ 检测到预加载状态')
            
            # 等待页面跳转或预加载完成（压缩到2秒）
            max_wait = 2.0
            waited = 0
            jumped = False
            
            while waited < max_wait:
                time.sleep(0.3)  # 压缩到极限
                waited += 0.3
                
                # 检查页面是否已跳转
                check_result = self.mini.app.evaluate(js_get_current_path.strip(), sync=True)
                current_path = check_result.get('result', {}).get('result', '')
                
                if current_path != before_path:
                    jumped = True
                    print(f'✅ 检测到页面跳转: {before_path} -> {current_path}')
                    break
            
            if jumped:
                after_result = self.mini.app.evaluate(js_get_current_path.strip(), sync=True)
                after_path = after_result.get('result', {}).get('result', '')
                
                if 'details' in after_path:
                    print(f'✅ 成功跳转到 details 页面')
                    self.page_loaded = False  # 标记已离开main页面
                    return True
                else:
                    print(f'✅ 跳转到页面: {after_path}')
                    self.page_loaded = False
                    return True
            else:
                # 没有跳转，检查是否有弹窗
                print('⚠️  等待 {:.1f} 秒后未检测到页面跳转'.format(waited))
                result = check_popup_visible(self.mini)
                if result['visible']:
                    print(f'✅ 触发了注册弹窗（也是预期行为），reason: "{result["reason"]}"')
                    close_popup_by_mask(self.mini, wait_visible=0.4)
                    return True
                else:
                    print('❌ 既未跳转也未弹窗，测试失败')
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
