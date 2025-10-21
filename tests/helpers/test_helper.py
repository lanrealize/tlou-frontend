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
        
        # 等待后端清理和身份恢复完成
        time.sleep(2.0)
        
        # 等待一下，避免与测试中的页面跳转冲突
        time.sleep(1.0)
        
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
