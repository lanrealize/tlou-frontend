#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
系统辅助工具 - 小程序生命周期和测试模式管理
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
    """进入测试模式 - 调用 getApp().devTools.startTestMode()
    
    自动清理残留的测试模式和测试用户，确保测试环境干净
    """
    try:
        # 先清理可能存在的残留状态
        print('🎭 进入测试模式（先清理残留状态）...')
        exit_test_mode(mini)
        
        print('🎭 启动新的测试模式...')
        
        # 直接调用 startTestMode()，让它处理所有逻辑
        js_code = """
function callStartTestMode() {
    return getApp().devTools.startTestMode();
}
        """
        mini.app.evaluate(js_code.strip(), sync=True)
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
        
        # 调用 endTestMode() 并等待完成（sync=True 会自动等待 Promise）
        js_code = """
function callEndTestMode() {
    return getApp().devTools.endTestMode();
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

