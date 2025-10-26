#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试辅助工具包
"""

from .test_helper import (
    launch_miniprogram,
    close_miniprogram,
    enter_test_mode,
    exit_test_mode,
    check_circle_status_action,
    navigate_to_details,
    navigate_to_details_from_share,
    complete_user_login,
    verify_login_status,
    handle_modal_confirm,
    handle_modal_cancel
)

from .popup_helper import (
    check_popup_visible,
    close_popup_by_mask,
    ensure_popup_closed
)

# 新增的辅助模块
from . import js_helpers
from . import element_helpers
from . import virtual_user_helper
from . import common_helper

# 虚拟用户helper
from .virtual_user_helper import (
    navigate_to_management_page,
    get_current_identity,
    get_virtual_users_list,
    create_virtual_user,
    switch_to_virtual_identity,
    switch_to_real_identity,
    delete_virtual_user
)

# 朋友圈helper
from .circle_helper import (
    create_circle
)

# 帖子helper
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

__all__ = [
    # test_helper
    'launch_miniprogram',
    'close_miniprogram',
    'enter_test_mode',
    'exit_test_mode',
    'check_circle_status_action',
    'navigate_to_details',
    'navigate_to_details_from_share',
    'complete_user_login',
    'verify_login_status',
    'handle_modal_confirm',
    'handle_modal_cancel',
    
    # popup_helper
    'check_popup_visible',
    'close_popup_by_mask',
    'ensure_popup_closed',
    
    # virtual_user_helper
    'navigate_to_management_page',
    'get_current_identity',
    'get_virtual_users_list',
    'create_virtual_user',
    'switch_to_virtual_identity',
    'switch_to_real_identity',
    'delete_virtual_user',
    
    # circle_helper
    'create_circle',
    
    # post_helper
    'publish_post_with_single_image',
    'publish_post_with_multi_images',
    'like_post',
    'unlike_post',
    'comment_on_post',
    'reply_to_comment',
    'delete_comment',
    'delete_post',
    
    # 新增模块
    'js_helpers',
    'element_helpers',
    'virtual_user_helper',
    'common_helper',
    'circle_helper',
    'post_helper',
]
