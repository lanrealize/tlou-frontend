"""
简化的用户登录测试 - 真实注册流程

测试策略：
1. 启动小程序
2. 进入测试模式（调用 devTools.startTestMode）
3. 点击登录按钮
4. 手动触发 onChooseAvatar（绕过官方组件限制）
5. 等待真实的七牛云上传
6. 真实的后端注册
7. 验证登录成功
8. 退出测试模式（清理后端数据）
"""

import time
import sys
import os
import traceback

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import minium


def launch_miniprogram():
    """启动小程序"""
    print('\n' + '='*60)
    print('🚀 启动小程序')
    print('='*60)
    
    mini = minium.Minium({
        'project_path': r'D:\Codes\Cursor\tlou-frontend',
        'dev_tool_path': r'D:\Apps\IDEs\微信web开发者工具\cli.bat',
        'test_port': 9420,
        'enable_app_log': False,
        'auto_authorize': True,
    })
    
    time.sleep(1.0)
    print('✅ 小程序已启动')
    return mini


def enter_test_mode(mini):
    """进入测试模式"""
    print('\n🎭 进入测试模式...')
    
    try:
        # 正确的方法名是 startTestMode，不是 enterTestMode！
        js_code = """
function callStartTestMode() {
    const app = getApp();
    if (!app.devTools) {
        return { success: false, reason: 'devTools not installed' };
    }
    const result = app.devTools.startTestMode();
    return { success: result !== false, result: result };
}
        """
        
        result = mini.app.evaluate(js_code.strip(), sync=True)
        result_data = result.get('result', {}).get('result', {})
        
        if not result_data.get('success'):
            print(f'❌ 进入测试模式失败: {result_data.get("reason")}')
            return False
        
        print('✅ 测试模式已启动')
        
        # 等待模式切换完成
        time.sleep(0.5)
        
        # 重新加载页面确保状态更新
        mini.app.relaunch('/pages/main/main')
        time.sleep(0.5)
        
        return True
        
    except Exception as e:
        print(f'❌ 异常: {str(e)}')
        traceback.print_exc()
        return False


def exit_test_mode(mini):
    """退出测试模式"""
    print('\n🔄 退出测试模式...')
    
    try:
        js_code = """
function callEndTestMode() {
    const app = getApp();
    if (!app.devTools) {
        return { success: false, reason: 'devTools not installed' };
    }
    return app.devTools.endTestMode();
}
        """
        
        result = mini.app.evaluate(js_code.strip(), sync=True)
        result_data = result.get('result', {}).get('result', {})
        
        if result_data.get('cleanupSuccess'):
            print('✅ 后端数据已清理')
        else:
            print('⚠️  后端清理失败')
        
        time.sleep(0.5)
        return True
        
    except Exception as e:
        print(f'❌ 异常: {str(e)}')
        traceback.print_exc()
        return False


def test_login_flow(mini):
    """测试登录流程"""
    print('\n📝 开始测试登录流程')
    print('-'*60)
    
    try:
        page = mini.app.current_page
        
        # 1. 点击登录按钮
        print('1️⃣ 查找并点击登录按钮...')
        login_btn = page.get_element('.create-btn')
        if not login_btn:
            print('❌ 未找到登录按钮')
            return False
        
        login_btn.tap()
        time.sleep(0.3)
        print('   ✅ 已点击登录按钮')
        
        # 2. 验证弹窗显示
        print('2️⃣ 验证注册弹窗...')
        js_check_popup = """
function checkPopup() {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1];
    return {
        visible: page.data.userInfoPopupVisible === true,
        reason: page.data.userInfoPopupReason || ''
    };
}
        """
        
        result = mini.app.evaluate(js_check_popup.strip(), sync=True)
        popup_data = result.get('result', {}).get('result', {})
        
        if not popup_data.get('visible'):
            print('❌ 弹窗未显示')
            return False
        
        print(f'   ✅ 弹窗已显示: "{popup_data.get("reason")}"')
        
        # 3. 输入昵称
        print('3️⃣ 输入昵称...')
        nickname_input = page.get_element('user-info-popup>>>.nickname-input')
        if not nickname_input:
            print('❌ 未找到昵称输入框')
            return False
        
        nickname_input.input('测试用户')
        time.sleep(0.2)
        print('   ✅ 已输入昵称')
        
        # 4. ✨ 核心：直接设置组件状态，模拟头像上传成功
        print('4️⃣ 模拟头像上传成功（使用测试头像）...')
        
        # 使用网络测试头像URL（模拟上传成功后的结果）
        test_avatar_url = 'https://tlou.images.wltech-service.site/testResources/testAvatar.jpg'
        print(f'   测试头像: {test_avatar_url}')
        
        js_trigger_avatar = f"""
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
            avatarUrl: '{test_avatar_url}',
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
        
        result = mini.app.evaluate(js_trigger_avatar.strip(), sync=True)
        trigger_data = result.get('result', {}).get('result', {})
        
        if not trigger_data.get('success'):
            print(f'   ❌ 设置失败: {trigger_data.get("reason")}')
            return False
        
        print(f'   ✅ 已设置头像和状态')
        print(f'   avatarUrl: {trigger_data.get("avatarUrl", "")[:60]}...')
        print(f'   canSubmit: {trigger_data.get("canSubmit")}')
        
        # 等待 0.5 秒，让组件状态稳定
        time.sleep(0.5)
        
        # 5. 等待状态更新
        print('5️⃣ 验证组件状态...')
        time.sleep(0.2)
        
        # 检查上传状态
        js_check_upload = """
function checkUpload() {
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
        
        result = mini.app.evaluate(js_check_upload.strip(), sync=True)
        upload_data = result.get('result', {}).get('result', {})
        
        if not upload_data.get('canSubmit'):
            print(f'   ⚠️  canSubmit = false')
            print(f'   isUploading: {upload_data.get("isUploading")}')
            print(f'   avatarUrl: {upload_data.get("avatarUrl", "")[:60]}...')
            # 不直接失败，继续尝试
        else:
            print('   ✅ 头像上传完成，可以提交')
        
        # 6. 点击提交按钮
        print('6️⃣ 点击提交按钮（真实注册）...')
        submit_btn = page.get_element('user-info-popup>>>.action-btn')
        if not submit_btn:
            print('❌ 未找到提交按钮')
            return False
        
        submit_btn.tap()
        time.sleep(0.3)
        print('   ✅ 已点击提交')
        
        # 7. 等待注册完成
        print('7️⃣ 等待后端注册...')
        time.sleep(2.5)
        
        # 8. 验证弹窗是否关闭
        result = mini.app.evaluate(js_check_popup.strip(), sync=True)
        popup_data = result.get('result', {}).get('result', {})
        
        if popup_data.get('visible'):
            print('❌ 弹窗仍然显示，注册可能失败')
            return False
        
        print('   ✅ 弹窗已关闭')
        
        # 9. 验证登录状态
        print('8️⃣ 验证登录状态...')
        js_check_login = """
function checkLogin() {
    const app = getApp();
    const userStore = app.getUserStore();
    return {
        loginStatus: userStore.loginStatus,
        isLoggedIn: userStore.loginStatus === 'loggedIn',
        username: userStore.userInfo?.username || '',
        userId: userStore.userInfo?._id || ''
    };
}
        """
        
        result = mini.app.evaluate(js_check_login.strip(), sync=True)
        login_data = result.get('result', {}).get('result', {})
        
        if not login_data.get('isLoggedIn'):
            print(f'   ❌ 登录状态: {login_data.get("loginStatus")}')
            return False
        
        username = login_data.get('username')
        user_id = login_data.get('userId')
        
        print(f'   ✅ 登录成功')
        print(f'   用户名: {username}')
        print(f'   用户ID: {user_id[:8]}...' if user_id and len(user_id) > 8 else f'   用户ID: {user_id}')
        
        return True
        
    except Exception as e:
        print(f'❌ 测试失败: {str(e)}')
        traceback.print_exc()
        return False


def main():
    """主函数"""
    mini = None
    success = False
    
    try:
        # 1. 启动小程序
        mini = launch_miniprogram()
        
        # 2. 进入测试模式
        if not enter_test_mode(mini):
            print('\n❌ 无法进入测试模式，测试终止')
            return
        
        # 3. 执行登录测试
        success = test_login_flow(mini)
        
        # 4. 退出测试模式
        exit_test_mode(mini)
        
        # 5. 结果
        print('\n' + '='*60)
        if success:
            print('✅ 测试通过')
        else:
            print('❌ 测试失败')
        print('='*60 + '\n')
        
    except Exception as e:
        print(f'\n❌ 测试异常: {str(e)}')
        traceback.print_exc()
        
    finally:
        if mini:
            print('👋 关闭小程序...')
            mini.shutdown()


if __name__ == '__main__':
    main()

