#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
元素操作辅助工具 - 封装元素查找和交互的通用模式
"""

import time


class ElementNotFoundError(Exception):
    """元素未找到异常"""
    pass


class PageNotReadyError(Exception):
    """页面未就绪异常"""
    pass


def find_element_safe(page, selector, required=False, wait_time=0.3):
    """
    安全地查找元素，区分"未找到"和"其他错误"
    
    Args:
        page: 页面对象
        selector: 元素选择器
        required: 是否必需（如果为True且找不到会抛出异常）
        wait_time: 查找前等待时间
        
    Returns:
        element: 元素对象，如果未找到且不是必需则返回None
        
    Raises:
        ElementNotFoundError: 如果required=True且未找到元素
        PageNotReadyError: 如果发生其他错误（页面崩溃等）
    """
    if wait_time > 0:
        time.sleep(wait_time)
    
    try:
        element = page.get_element(selector)
        return element
    except Exception as e:
        error_msg = str(e).lower()
        # 区分"元素不存在"和"严重错误"
        is_not_found = any(keyword in error_msg for keyword in ['not found', 'no such', 'element'])
        
        if is_not_found:
            if required:
                raise ElementNotFoundError(f'必需元素未找到: {selector}')
            return None
        else:
            # 页面崩溃、网络错误等严重问题
            raise PageNotReadyError(f'查找元素时发生严重错误: {str(e)}')


def find_elements_safe(page, selector, required=False, wait_time=0.3):
    """
    安全地查找多个元素
    
    Args:
        page: 页面对象
        selector: 元素选择器
        required: 是否必需（如果为True且找不到会抛出异常）
        wait_time: 查找前等待时间
        
    Returns:
        list: 元素列表，如果未找到则返回空列表
        
    Raises:
        ElementNotFoundError: 如果required=True且未找到元素
        PageNotReadyError: 如果发生其他错误
    """
    if wait_time > 0:
        time.sleep(wait_time)
    
    try:
        elements = page.get_elements(selector)
        if not elements or len(elements) == 0:
            if required:
                raise ElementNotFoundError(f'必需元素未找到: {selector}')
            return []
        return elements
    except Exception as e:
        error_msg = str(e).lower()
        is_not_found = any(keyword in error_msg for keyword in ['not found', 'no such', 'element'])
        
        if is_not_found:
            if required:
                raise ElementNotFoundError(f'必需元素未找到: {selector}')
            return []
        else:
            raise PageNotReadyError(f'查找元素时发生严重错误: {str(e)}')


def tap_element_safe(page, selector, wait_before=0.3, wait_after=0.3):
    """
    安全地点击元素
    
    Args:
        page: 页面对象
        selector: 元素选择器
        wait_before: 点击前等待时间
        wait_after: 点击后等待时间
        
    Returns:
        bool: 是否成功点击
        
    Raises:
        ElementNotFoundError: 如果未找到元素
        PageNotReadyError: 如果发生其他错误
    """
    element = find_element_safe(page, selector, required=True, wait_time=wait_before)
    element.tap()
    if wait_after > 0:
        time.sleep(wait_after)
    return True


def input_text_safe(page, selector, text, wait_before=0.2, wait_after=0.3):
    """
    安全地输入文本
    
    Args:
        page: 页面对象
        selector: 元素选择器
        text: 要输入的文本
        wait_before: 输入前等待时间
        wait_after: 输入后等待时间
        
    Returns:
        bool: 是否成功输入
        
    Raises:
        ElementNotFoundError: 如果未找到元素
    """
    element = find_element_safe(page, selector, required=True, wait_time=wait_before)
    element.input(text)
    if wait_after > 0:
        time.sleep(wait_after)
    return True


def find_element_with_retry(page, selector, max_retries=3, retry_interval=0.5):
    """
    带重试机制查找元素
    
    Args:
        page: 页面对象
        selector: 元素选择器
        max_retries: 最大重试次数
        retry_interval: 重试间隔（秒）
        
    Returns:
        element: 元素对象，如果所有重试都失败则返回None
    """
    for attempt in range(max_retries):
        try:
            element = find_element_safe(page, selector, required=False)
            if element:
                return element
        except PageNotReadyError:
            # 如果是严重错误，不要重试
            raise
        
        if attempt < max_retries - 1:
            time.sleep(retry_interval)
    
    return None


def wait_for_element(page, selector, timeout=5.0, check_interval=0.5):
    """
    等待元素出现
    
    Args:
        page: 页面对象
        selector: 元素选择器
        timeout: 超时时间（秒）
        check_interval: 检查间隔（秒）
        
    Returns:
        element: 元素对象，如果超时则返回None
    """
    elapsed = 0
    while elapsed < timeout:
        try:
            element = find_element_safe(page, selector, required=False, wait_time=0)
            if element:
                return element
        except PageNotReadyError:
            # 严重错误，直接返回
            return None
        
        time.sleep(check_interval)
        elapsed += check_interval
    
    return None


def wait_for_element_disappear(page, selector, timeout=5.0, check_interval=0.5):
    """
    等待元素消失
    
    Args:
        page: 页面对象
        selector: 元素选择器
        timeout: 超时时间（秒）
        check_interval: 检查间隔（秒）
        
    Returns:
        bool: 元素是否已消失
    """
    elapsed = 0
    while elapsed < timeout:
        try:
            element = find_element_safe(page, selector, required=False, wait_time=0)
            if not element:
                return True
        except PageNotReadyError:
            # 页面出问题也算是"消失"了
            return True
        
        time.sleep(check_interval)
        elapsed += check_interval
    
    return False


# ============================================
# 组件元素操作（穿透组件边界）
# ============================================

def find_component_element(page, component_selector, element_selector, required=False):
    """
    查找组件内部的元素（使用 >>> 穿透选择器）
    
    Args:
        page: 页面对象
        component_selector: 组件选择器
        element_selector: 元素选择器
        required: 是否必需
        
    Returns:
        element: 元素对象或None
    """
    full_selector = f'{component_selector}>>>{element_selector}'
    return find_element_safe(page, full_selector, required=required)


def tap_component_element(page, component_selector, element_selector, wait_after=0.3):
    """
    点击组件内部的元素
    
    Args:
        page: 页面对象
        component_selector: 组件选择器
        element_selector: 元素选择器
        wait_after: 点击后等待时间
        
    Returns:
        bool: 是否成功点击
    """
    full_selector = f'{component_selector}>>>{element_selector}'
    return tap_element_safe(page, full_selector, wait_after=wait_after)


# ============================================
# 常用元素操作封装
# ============================================

def click_button_by_text(page, button_text, wait_after=0.3):
    """
    通过按钮文本点击按钮
    
    Args:
        page: 页面对象
        button_text: 按钮文本
        wait_after: 点击后等待时间
        
    Returns:
        bool: 是否成功点击
    """
    # 尝试多种选择器
    selectors = [
        f'button:contains("{button_text}")',
        f'.btn:contains("{button_text}")',
        f'view:contains("{button_text}")'
    ]
    
    for selector in selectors:
        try:
            element = find_element_safe(page, selector, required=False)
            if element:
                element.tap()
                if wait_after > 0:
                    time.sleep(wait_after)
                return True
        except:
            continue
    
    return False


def scroll_to_bottom(page, wait_after=0.5):
    """
    滚动到页面底部
    
    Args:
        page: 页面对象
        wait_after: 滚动后等待时间
    """
    try:
        # 使用 Minium 的滚动方法
        page.scroll_to(0, 10000)  # 滚动到很大的Y坐标
        if wait_after > 0:
            time.sleep(wait_after)
        return True
    except:
        return False


def get_element_attribute(page, selector, attribute):
    """
    获取元素属性
    
    Args:
        page: 页面对象
        selector: 元素选择器
        attribute: 属性名
        
    Returns:
        属性值或None
    """
    element = find_element_safe(page, selector, required=False)
    if element:
        try:
            return getattr(element, attribute, None)
        except:
            return None
    return None


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
    处理微信小程序原生Modal取消操作
    
    Args:
        mini: Minium 实例
        timeout: 超时时间（秒），默认3秒
        
    Returns:
        bool: 是否成功处理
    """
    try:
        import time
        time.sleep(0.5)
        
        # 使用Minium内置方法，传入"取消"
        result = mini.native.handle_modal("取消")
        
        if result:
            print('   ✅ Modal取消成功')
        else:
            print('   ⚠️  Modal取消失败')
            
        return result
    except Exception as e:
        print(f'   ❌ Modal取消异常: {str(e)}')
        return False
