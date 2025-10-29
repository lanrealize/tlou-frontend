#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用辅助工具

提供测试中常用的通用功能，如图片上传、文件处理等。
"""

import os
import time
import base64


# ============================================
# JavaScript 执行工具
# ============================================

def evaluate_js(mini, js_code):
    """执行 JavaScript 代码并返回结果
    
    自动包装为命名函数，只需要写核心逻辑。
    
    Args:
        mini: Minium 实例
        js_code: JavaScript 代码（字符串）
    
    Returns:
        dict: JavaScript 执行的返回值
    
    示例:
        js_code = '''
            const app = getApp();
            return app.getUserStore().userInfo;
        '''
        result = evaluate_js(mini, js_code)
    """
    import time
    # 生成唯一函数名
    func_name = f"evalFunc{int(time.time() * 1000000) % 1000000000}"
    
    # 对每一行添加适当的缩进（4个空格）
    lines = js_code.strip().split('\n')
    indented_lines = ['    ' + line if line.strip() else '' for line in lines]
    indented_code = '\n'.join(indented_lines)
    
    # 按照项目中其他地方的格式：三引号后换行，函数定义，最后strip
    code = f"""
function {func_name}() {{
{indented_code}
}}
"""
    
    result = mini.app.evaluate(code.strip(), sync=True)
    return result.get('result', {}).get('result', {})


def mock_image_selection(mini, image_paths):
    """
    使用 Minium Mock 选择真实图片文件
    
    此函数封装了图片选择的完整流程：
    1. 验证图片文件存在
    2. 读取图片并编码为 base64
    3. 使用 Minium mock_choose_images API 设置 Mock
    
    Args:
        mini: Minium 实例
        image_paths: 图片路径列表（单个图片也可传字符串）
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'image_count': int,
            'image_paths': list
        }
    """
    try:
        # 支持单个图片路径（字符串）
        if isinstance(image_paths, str):
            image_paths = [image_paths]
        
        print(f'   📸 准备选择 {len(image_paths)} 张图片...')
        
        # 1. 检查测试图片是否存在
        real_images = []
        for path in image_paths:
            if os.path.exists(path):
                real_images.append(path)
                size_kb = round(os.path.getsize(path) / 1024, 1)
                print(f'   ✅ 找到图片: {os.path.basename(path)} ({size_kb}KB)')
            else:
                print(f'   ⚠️  图片不存在: {path}')
        
        if not real_images:
            return {
                'success': False,
                'message': '没有可用的测试图片文件',
                'image_count': 0,
                'image_paths': []
            }
        
        # 2. 准备 Mock 数据
        print(f'   🎯 设置图片选择 Mock ({len(real_images)} 张)')
        
        mock_images_data = []
        
        for path in real_images:
            # 获取图片文件名
            image_name = os.path.basename(path)
            
            # 读取图片并编码为 base64
            with open(path, 'rb') as img_file:
                b64_data = base64.b64encode(img_file.read()).decode('utf-8')
            
            mock_images_data.append({
                "name": image_name,
                "b64data": b64_data
            })
        
        # 3. 使用 Minium 内置 Mock API
        mini.app.mock_choose_images(mock_images_data)
        print('   ✅ Minium Mock 设置成功')
        
        return {
            'success': True,
            'message': f'成功设置 {len(real_images)} 张图片的 Mock',
            'image_count': len(real_images),
            'image_paths': real_images
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'Mock 设置失败: {str(e)}',
            'image_count': 0,
            'image_paths': []
        }


def upload_single_image_with_button(mini, image_path, button_selector, wait_after=2.0):
    """
    上传单张图片（点击按钮触发选择）
    
    完整流程：
    1. 设置图片选择 Mock
    2. 点击上传按钮
    3. 等待上传完成
    
    Args:
        mini: Minium 实例
        image_path: 图片路径
        button_selector: 上传按钮的 CSS 选择器
        wait_after: 上传后等待时间（秒）
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'image_path': str
        }
    """
    try:
        print(f'   📤 上传图片: {os.path.basename(image_path) if os.path.exists(image_path) else image_path}')
        
        # 1. 设置 Mock
        mock_result = mock_image_selection(mini, image_path)
        if not mock_result['success']:
            return {
                'success': False,
                'message': f'Mock 设置失败: {mock_result["message"]}',
                'image_path': image_path
            }
        
        # 2. 点击上传按钮
        page = mini.app.current_page
        
        try:
            time.sleep(0.3)
            upload_btn = page.get_element(button_selector)
            upload_btn.tap()
            time.sleep(0.3)
            print(f'   ✅ 已点击上传按钮: {button_selector}')
        except Exception as e:
            return {
                'success': False,
                'message': f'点击按钮失败: {str(e)}',
                'image_path': image_path
            }
        
        # 3. 等待上传完成
        print(f'   ⏳ 等待上传完成...')
        time.sleep(wait_after)
        
        print(f'   ✅ 图片上传完成')
        
        return {
            'success': True,
            'message': '图片上传成功',
            'image_path': image_path
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'上传过程异常: {str(e)}',
            'image_path': image_path
        }


def upload_multiple_images_with_button(mini, image_paths, button_selector, wait_after=2.0):
    """
    上传多张图片（点击按钮触发选择）
    
    Args:
        mini: Minium 实例
        image_paths: 图片路径列表
        button_selector: 上传按钮的 CSS 选择器
        wait_after: 上传后等待时间（秒）
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'image_count': int,
            'image_paths': list
        }
    """
    try:
        print(f'   📤 上传 {len(image_paths)} 张图片')
        
        # 1. 设置 Mock
        mock_result = mock_image_selection(mini, image_paths)
        if not mock_result['success']:
            return {
                'success': False,
                'message': f'Mock 设置失败: {mock_result["message"]}',
                'image_count': 0,
                'image_paths': []
            }
        
        # 2. 点击上传按钮
        page = mini.app.current_page
        
        try:
            time.sleep(0.3)
            upload_btn = page.get_element(button_selector)
            upload_btn.tap()
            time.sleep(0.3)
            print(f'   ✅ 已点击上传按钮: {button_selector}')
        except Exception as e:
            return {
                'success': False,
                'message': f'点击按钮失败: {str(e)}',
                'image_count': 0,
                'image_paths': []
            }
        
        # 3. 等待上传完成
        print(f'   ⏳ 等待上传完成...')
        time.sleep(wait_after)
        
        print(f'   ✅ {len(image_paths)} 张图片上传完成')
        
        return {
            'success': True,
            'message': f'成功上传 {len(image_paths)} 张图片',
            'image_count': len(image_paths),
            'image_paths': mock_result['image_paths']
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'上传过程异常: {str(e)}',
            'image_count': 0,
            'image_paths': []
        }


def get_test_image_path(filename='test.jpg'):
    """
    获取测试图片的完整路径
    
    Args:
        filename: 图片文件名（默认 'test.jpg'）
        
    Returns:
        str: 图片的完整路径
    """
    # 假设测试图片在 tests/resources/ 目录下
    script_dir = os.path.dirname(os.path.abspath(__file__))
    tests_dir = os.path.dirname(script_dir)
    image_path = os.path.join(tests_dir, 'resources', filename)
    
    return image_path


def verify_test_images_exist(image_names=None):
    """
    验证测试图片是否存在
    
    Args:
        image_names: 图片文件名列表（可选，默认检查 test.jpg, test1.jpg, test2.jpg）
        
    Returns:
        dict: {
            'all_exist': bool,
            'existing_images': list,
            'missing_images': list
        }
    """
    if image_names is None:
        image_names = ['test.jpg', 'test1.jpg', 'test2.jpg']
    
    existing_images = []
    missing_images = []
    
    for name in image_names:
        path = get_test_image_path(name)
        if os.path.exists(path):
            existing_images.append(path)
        else:
            missing_images.append(name)
    
    return {
        'all_exist': len(missing_images) == 0,
        'existing_images': existing_images,
        'missing_images': missing_images
    }


# ============================================
# Modal 对话框处理
# ============================================

def handle_modal_confirm(mini, button_text="确定", timeout=3.0):
    """处理微信小程序原生Modal确认对话框
    
    Args:
        mini: Minium 实例
        button_text: 要点击的按钮文字，默认"确定"
        timeout: 超时时间（秒），默认3秒
        
    Returns:
        bool: 是否成功处理
    
    Note:
        mini.native.handle_modal() 会自动等待 modal 出现，不需要额外 sleep
    """
    try:
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
    """处理微信小程序原生Modal取消操作
    
    Args:
        mini: Minium 实例
        timeout: 超时时间（秒），默认3秒
        
    Returns:
        bool: 是否成功处理
    """
    try:
        import time
        time.sleep(0.5)
        result = mini.native.handle_modal("取消")
        if result:
            print('   ✅ Modal取消成功')
        else:
            print('   ⚠️  Modal取消失败')
        return result
    except Exception as e:
        print(f'   ❌ Modal取消异常: {str(e)}')
        return False


# ============================================
# Toast 提示框处理
# ============================================

def check_toast(mini, expected_text=None, since=None):
    """检查微信小程序Toast提示框
    
    使用 mini.app.get_modals() 获取 toast 信息
    Minium 会自动 hook showToast，无需额外等待
    
    Args:
        mini: Minium 实例
        expected_text: 期望的Toast文字（可选）。如果提供，会验证Toast内容是否匹配
        since: 时间戳，只获取此时间之后的toast（可选）
        
    Returns:
        dict: {
            'success': bool,    # 是否成功获取到Toast
            'text': str,        # Toast的文字内容（最新的一个）
            'match': bool,      # 如果提供了expected_text，表示是否匹配
            'all_toasts': list  # 所有获取到的toast列表
        }
        
    示例:
        # 获取最新的Toast
        result = check_toast(mini)
        if result['success']:
            print(f"Toast内容: {result['text']}")
        
        # 检查Toast内容是否匹配
        result = check_toast(mini, "发布成功")
        if result['success'] and result['match']:
            print("Toast内容符合预期")
    """
    try:
        # 使用 app.get_modals() 获取所有弹窗信息（包括 toast）
        modals = mini.app.get_modals(since=since)
        
        # 过滤出 toast
        toasts = [m for m in modals if m.get('type') == 'toast']
        
        if toasts:
            # 获取最新的 toast（最后一个）
            latest_toast = toasts[-1]
            toast_text = latest_toast.get('title', '')
            
            print(f'   💬 Toast内容: "{toast_text}"')
            print(f'   📋 共获取到 {len(toasts)} 个Toast')
            
            # 如果提供了期望文字，进行匹配检查
            if expected_text is not None:
                match = (toast_text == expected_text) or (expected_text in toast_text)
                if match:
                    print(f'   ✅ Toast内容匹配: "{expected_text}"')
                else:
                    print(f'   ⚠️  Toast内容不匹配 - 期望: "{expected_text}", 实际: "{toast_text}"')
                
                return {
                    'success': True,
                    'text': toast_text,
                    'match': match,
                    'all_toasts': toasts
                }
            
            return {
                'success': True,
                'text': toast_text,
                'match': None,
                'all_toasts': toasts
            }
        else:
            print('   ⚠️  未检测到Toast')
            return {
                'success': False,
                'text': '',
                'match': False if expected_text is not None else None,
                'all_toasts': []
            }
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f'   ❌ Toast检查异常: {str(e)}')
        return {
            'success': False,
            'text': '',
            'match': False if expected_text is not None else None,
            'all_toasts': []
        }