#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试辅助工具包
"""

from .test_helper import (
    launch_miniprogram,
    close_miniprogram,
    enter_test_mode,
    exit_test_mode
)

from .popup_helper import (
    check_popup_visible,
    close_popup_by_mask,
    wait_popup_closed,
    ensure_popup_closed
)

__all__ = [
    # test_helper
    'launch_miniprogram',
    'close_miniprogram',
    'enter_test_mode',
    'exit_test_mode',
    
    # popup_helper
    'check_popup_visible',
    'close_popup_by_mask',
    'wait_popup_closed',
    'ensure_popup_closed',
]
