#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试辅助工具包
"""

# system_helper
from .system_helper import (
    launch_miniprogram,
    close_miniprogram,
    enter_test_mode,
    exit_test_mode
)

# auth_helper
from .auth_helper import (
    get_user_state,
    verify_identity,
    complete_user_login,
    verify_login_status,
    check_register_popup_visible,
    close_register_popup_by_mask,
    ensure_register_popup_closed
)

# share_helper
from .share_helper import (
    navigate_to_details_from_share
)

# circle_helper
from .circle_helper import (
    create_circle,
    check_circle_status_action
)

# post_helper
from .post_helper import (
    publish_post_with_single_image,
    publish_post_with_multi_images,
    like_post,
    unlike_post,
    comment_on_post,
    reply_to_comment,
    delete_comment,
    delete_post
)

# common_helper (modal functions)
from .common_helper import (
    handle_modal_confirm,
    handle_modal_cancel
)

# virtual_user_helper
from .virtual_user_helper import (
    navigate_to_management_page,
    get_current_identity,
    get_virtual_users_list,
    create_virtual_user,
    switch_to_virtual_identity,
    switch_to_real_identity,
    delete_virtual_user
)

# 新增的辅助模块
from . import virtual_user_helper
from . import common_helper

__all__ = [
    # system_helper
    'launch_miniprogram',
    'close_miniprogram',
    'enter_test_mode',
    'exit_test_mode',
    
    # auth_helper
    'get_user_state',
    'verify_identity',
    'complete_user_login',
    'verify_login_status',
    'check_register_popup_visible',
    'close_register_popup_by_mask',
    'ensure_register_popup_closed',
    
    # share_helper
    'navigate_to_details_from_share',
    
    # circle_helper
    'create_circle',
    'check_circle_status_action',
    
    # post_helper
    'publish_post_with_single_image',
    'publish_post_with_multi_images',
    'like_post',
    'unlike_post',
    'comment_on_post',
    'reply_to_comment',
    'delete_comment',
    'delete_post',
    
    # common_helper (modal)
    'handle_modal_confirm',
    'handle_modal_cancel',
    
    # virtual_user_helper
    'navigate_to_management_page',
    'get_current_identity',
    'get_virtual_users_list',
    'create_virtual_user',
    'switch_to_virtual_identity',
    'switch_to_real_identity',
    'delete_virtual_user',
    
    # 新增模块
    'element_helpers',
    'virtual_user_helper',
    'common_helper',
    'system_helper',
    'auth_helper',
    'navigation_helper',
    'circle_helper',
    'post_helper',
]
