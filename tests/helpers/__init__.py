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
from . import validation_helpers
from . import post_helpers

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
    
    # 新增模块
    'js_helpers',
    'element_helpers',
    'validation_helpers',
    'post_helpers',
]
