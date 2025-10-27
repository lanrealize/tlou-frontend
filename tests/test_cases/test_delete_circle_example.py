#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单测试：删除朋友圈功能

测试流程：
1. 启动小程序
2. 创建朋友圈
3. 删除朋友圈
4. 验证删除成功
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.helpers import (
    launch_miniprogram,
    close_miniprogram,
    create_circle,
    delete_circle
)


def main():
    print('\n' + '='*60)
    print('测试删除朋友圈功能')
    print('='*60)
    
    mini = launch_miniprogram()
    
    try:
        # 1. 创建朋友圈
        print('\n[1] 创建朋友圈...')
        create_result = create_circle(mini)
        assert create_result['success'], f'创建失败: {create_result["message"]}'
        
        # 2. 保存 circle_id
        circle_id = create_result['circle_id']
        print(f'✅ 朋友圈已创建，ID: {circle_id[:8]}...')
        
        # 3. 删除朋友圈
        print('\n[2] 删除朋友圈...')
        delete_result = delete_circle(mini, circle_id)
        assert delete_result['success'], f'删除失败: {delete_result["message"]}'
        print(f'✅ 删除成功: {delete_result["circle_name"]}')
        
        print('\n' + '='*60)
        print('删除朋友圈测试通过！')
        print('='*60)
        
    finally:
        close_miniprogram(mini)


if __name__ == '__main__':
    main()

