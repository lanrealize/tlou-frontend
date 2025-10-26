#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""虚拟用户操作Helper - 简洁版"""

import time
from .common_helper import upload_single_image_with_button


# ============================================
# 内部 JavaScript 辅助函数
# ============================================

def _evaluate_js(mini, js_function):
    """执行 JavaScript 代码并返回结果（内部工具函数）"""
    result = mini.app.evaluate(js_function.strip(), sync=True)
    return result.get('result', {}).get('result', {})


# ============================================
# JS 代码
# ============================================

def js_get_current_identity():
    return """
    function getCurrentIdentity() {
        const app = getApp();
        const userStore = app.getUserStore();
        return {
            success: true,
            isAdmin: userStore.isAdmin || false,
            isVirtualIdentity: userStore.isVirtualIdentity || false,
            userInfo: {
                _id: userStore.userInfo?._id || '',
                username: userStore.userInfo?.username || '',
                avatar: userStore.userInfo?.avatar || ''
            }
        };
    }
    """


def js_get_virtual_users_list():
    return """
    function getVirtualUsersList() {
        const app = getApp();
        const userStore = app.getUserStore();
        const virtualUsers = userStore.virtualUsers || [];
        return {
            success: true,
            count: virtualUsers.length,
            users: virtualUsers.map(user => ({
                _id: user._id,
                username: user.username,
                avatar: user.avatar
            }))
        };
    }
    """


# ============================================
# 核心函数
# ============================================

def navigate_to_management_page(mini, force=False):
    """导航到管理页面"""
    try:
        identity_data = _evaluate_js(mini, js_get_current_identity())
        
        if not identity_data.get('isAdmin'):
            return {'success': False, 'message': '当前用户不是管理员'}
        
        current_page = mini.app.current_page
        page_path = current_page.path if current_page else ''
        
        if 'management' in page_path and not force:
            return {'success': True, 'message': '已在管理页面'}
        
        mini.app.navigate_to('/pages/management/management')
        time.sleep(1.5)
        
        return {'success': True, 'message': '导航成功'}
        
    except Exception as e:
        return {'success': False, 'message': f'导航异常: {str(e)}'}


def get_current_identity(mini):
    """获取当前身份"""
    result = _evaluate_js(mini, js_get_current_identity())
    return {
        'success': True,
        'is_admin': result.get('isAdmin', False),
        'is_virtual_identity': result.get('isVirtualIdentity', False),
        'user_info': result.get('userInfo', {})
    }


def get_virtual_users_list(mini):
    """获取虚拟用户列表"""
    result = _evaluate_js(mini, js_get_virtual_users_list())
    return result


def create_virtual_user(mini, username, avatar_path=None, auto_navigate=True):
    """创建虚拟用户（自动处理重名）"""
    try:
        if auto_navigate:
            nav_result = navigate_to_management_page(mini)
            if not nav_result['success']:
                return {'success': False, 'message': f'导航失败: {nav_result["message"]}'}
        
        # 检查是否存在同名用户，存在则先删除
        users = get_virtual_users_list(mini)
        existing_user = next((u for u in users['users'] if u['username'] == username), None)
        if existing_user:
            print(f'   ⚠️  检测到同名用户，先删除: {username}')
            delete_result = delete_virtual_user(mini, user_id=existing_user['_id'], auto_navigate=False)
            if not delete_result['success']:
                print(f'   ⚠️  删除失败（继续创建）: {delete_result["message"]}')
            time.sleep(1.0)
        
        page = mini.app.current_page
        
        # 输入用户名
        username_input = page.get_element('#virtual-username-input')
        username_input.input(username)
        time.sleep(0.3)
        
        # 上传头像（可选）
        if avatar_path:
            from .common_helper import get_test_image_path
            full_path = get_test_image_path(avatar_path)
            upload_single_image_with_button(mini, full_path, '#virtual-avatar-upload-btn', wait_after=1.0)
        
        # 点击创建按钮
        create_btn = page.get_element('#create-virtual-user-btn')
        create_btn.tap()
        time.sleep(2.0)
        
        # 验证创建成功
        users = get_virtual_users_list(mini)
        created_user = next((u for u in users['users'] if u['username'] == username), None)
        
        if not created_user:
            return {'success': False, 'message': '创建后未找到用户'}
        
        return {
            'success': True,
            'message': f'成功创建虚拟用户: {username}',
            'user_info': created_user,
            'virtual_users_count': users['count']
        }
        
    except Exception as e:
        return {'success': False, 'message': f'创建异常: {str(e)}'}


def switch_to_virtual_identity(mini, username=None, user_id=None, auto_navigate=True):
    """切换到虚拟身份"""
    try:
        if auto_navigate:
            nav_result = navigate_to_management_page(mini)
            if not nav_result['success']:
                return {'success': False, 'message': f'导航失败: {nav_result["message"]}'}
        
        # 查找目标用户
        users = get_virtual_users_list(mini)
        target_user = None
        for user in users['users']:
            if (username and user['username'] == username) or (user_id and user['_id'] == user_id):
                target_user = user
                break
        
        if not target_user:
            return {'success': False, 'message': f'未找到虚拟用户: {username or user_id}'}
        
        page = mini.app.current_page
        time.sleep(1.0)
        
        # 找到对应的用户卡片并点击切换按钮
        user_items = page.get_elements('.user-item')
        target_item = None
        for item in user_items:
            item_user_id = item.attribute('data-user-id')
            if isinstance(item_user_id, list) and len(item_user_id) > 0:
                item_user_id = item_user_id[0]
            
            if item_user_id == target_user['_id']:
                target_item = item
                break
        
        if not target_item:
            return {'success': False, 'message': f'未找到用户UI元素'}
        
        switch_btn = target_item.get_element('.switch-to-virtual-btn')
        switch_btn.tap()
        time.sleep(1.5)
        
        # 验证切换成功
        identity = get_current_identity(mini)
        if identity['user_info']['username'] != target_user['username']:
            return {'success': False, 'message': '切换后用户名不匹配'}
        
        return {
            'success': True,
            'message': f'成功切换到: {target_user["username"]}',
            'to_identity': identity
        }
        
    except Exception as e:
        return {'success': False, 'message': f'切换异常: {str(e)}'}


def switch_to_real_identity(mini, auto_navigate=True):
    """切换回真实身份"""
    try:
        if auto_navigate:
            nav_result = navigate_to_management_page(mini)
            if not nav_result['success']:
                return {'success': False, 'message': f'导航失败: {nav_result["message"]}'}
        
        page = mini.app.current_page
        time.sleep(0.5)  # 等待页面渲染
        
        switch_btn = page.get_element('#switch-to-real-btn')
        switch_btn.tap()
        time.sleep(0.5)  # 等待切换完成和列表刷新（需要更多时间）
        
        # 验证切换成功
        identity = get_current_identity(mini)
        if identity['is_virtual_identity']:
            return {'success': False, 'message': '切换后仍是虚拟身份'}
        
        return {
            'success': True,
            'message': '成功切换回真实身份',
            'to_identity': identity
        }
        
    except Exception as e:
        return {'success': False, 'message': f'切换异常: {str(e)}'}


def delete_virtual_user(mini, username=None, user_id=None, auto_navigate=True):
    """删除虚拟用户"""
    try:
        if auto_navigate:
            nav_result = navigate_to_management_page(mini)
            if not nav_result['success']:
                return {'success': False, 'message': f'导航失败: {nav_result["message"]}'}
        
        time.sleep(1.0)  # 等待页面渲染
        
        # 查找目标用户
        users = get_virtual_users_list(mini)
        target_user = None
        for user in users['users']:
            if (username and user['username'] == username) or (user_id and user['_id'] == user_id):
                target_user = user
                break
        
        if not target_user:
            return {'success': False, 'message': f'未找到虚拟用户: {username or user_id}'}
        
        page = mini.app.current_page
        time.sleep(1.0)
        
        # 找到对应的用户卡片并点击删除按钮
        user_items = page.get_elements('.user-item')
        target_item = None
        for item in user_items:
            item_user_id = item.attribute('data-user-id')
            if isinstance(item_user_id, list) and len(item_user_id) > 0:
                item_user_id = item_user_id[0]
            
            if item_user_id == target_user['_id']:
                target_item = item
                break
        
        if not target_item:
            return {'success': False, 'message': f'未找到用户UI元素'}
        
        delete_btn = target_item.get_element('.delete-virtual-user-btn')
        delete_btn.tap()
        time.sleep(0.5)
        
        # 确认删除
        from .element_helpers import handle_modal_confirm
        handle_modal_confirm(mini, "确定")
        time.sleep(2.0)
        
        # 验证删除成功
        after_users = get_virtual_users_list(mini)
        still_exists = any(u['_id'] == target_user['_id'] for u in after_users['users'])
        
        if still_exists:
            return {'success': False, 'message': '删除后用户仍存在'}
        
        return {
            'success': True,
            'message': f'成功删除: {target_user["username"]}',
            'deleted_user': target_user
        }
        
    except Exception as e:
        return {'success': False, 'message': f'删除异常: {str(e)}'}
