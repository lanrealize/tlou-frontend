#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单测试：进入发现有趣朋友圈功能

测试流程：
1. 启动小程序
2. 点击发现朋友圈卡片进入 details 页面
3. 验证图片一致性
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.helpers import (
    launch_miniprogram,
    close_miniprogram,
    enter_discover_circle
)


def main():
    print('\n' + '='*60)
    print('测试进入发现有趣朋友圈功能')
    print('='*60)
    
    mini = launch_miniprogram()
    
    try:
        # 进入发现朋友圈
        result = enter_discover_circle(mini)
        
        if result['success']:
            print(f'\n✅ 测试通过: {result["message"]}')
            print(f'   朋友圈ID: {result["circle_id"][:8]}...')
            print(f'   main 图片 src: {result["main_image_src"][:60] if result["main_image_src"] else "(空)"}...')
            print(f'   details 图片 src: {result["details_image_src"][:60] if result["details_image_src"] else "(空)"}...')
        else:
            print(f'\n❌ 测试失败: {result["message"]}')
            raise AssertionError(result["message"])
        
        print('\n' + '='*60)
        print('✅ 进入发现朋友圈测试通过！')
        print('='*60)
        
    finally:
        close_miniprogram(mini)


if __name__ == '__main__':
    main()

