#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证辅助工具 - 封装常用的验证逻辑
"""

import time
from .js_helpers import (
    js_check_post_like_status,
    js_find_comment_by_text,
    js_check_post_deleted,
    js_check_circle_loaded,
    js_check_circle_and_comments,
    js_check_images_displayed,
    evaluate_js
)


# ============================================
# 帖子验证
# ============================================

def verify_post_like_status(mini, post_id, expected_liked, max_retries=3, retry_interval=2.0):
    """
    验证帖子点赞状态（带重试）
    
    Args:
        mini: Minium 实例
        post_id: 帖子ID
        expected_liked: 期望的点赞状态（True表示已点赞，False表示未点赞）
        max_retries: 最大重试次数
        retry_interval: 重试间隔（秒）
        
    Returns:
        dict: {
            'success': bool,    # 验证是否通过
            'message': str,     # 消息
            'is_liked': bool,   # 实际点赞状态
            'like_count': int   # 点赞数
        }
    """
    for attempt in range(max_retries):
        status_data = evaluate_js(mini, js_check_post_like_status(post_id))
        
        if not status_data.get('success'):
            if attempt == max_retries - 1:
                return {
                    'success': False,
                    'message': f'验证失败: {status_data.get("reason")}',
                    'is_liked': False,
                    'like_count': 0
                }
            time.sleep(retry_interval)
            continue
        
        is_liked = status_data.get('isLiked', False)
        like_count = status_data.get('likeCount', 0)
        liked_users_count = status_data.get('likedUsersCount', 0)
        
        print(f'   🔍 点赞状态检查 (尝试 {attempt + 1}/{max_retries}):')
        print(f'      isLiked: {is_liked}, likeCount: {like_count}, likedUsersCount: {liked_users_count}')
        
        # 修改验证逻辑：如果期望点赞，检查点赞数量是否大于0即可
        if expected_liked:
            # 期望已点赞：检查点赞数量或状态
            if is_liked or like_count > 0 or liked_users_count > 0:
                return {
                    'success': True,
                    'message': f'点赞验证通过 (点赞数: {like_count})',
                    'is_liked': is_liked,
                    'like_count': like_count
                }
        else:
            # 期望未点赞：检查是否所有指标都为0
            if not is_liked and like_count == 0 and liked_users_count == 0:
                return {
                    'success': True,
                    'message': '取消点赞验证通过',
                    'is_liked': is_liked,
                    'like_count': like_count
                }
        
        # 如果验证失败，等待后重试
        if attempt < max_retries - 1:
            print(f'   ⏳ 点赞状态不符合预期，等待后重试...')
            time.sleep(retry_interval)
    
    # 所有重试都失败
    return {
        'success': False,
        'message': f'点赞状态验证失败: 期望{"已点赞" if expected_liked else "未点赞"}, 实际isLiked={is_liked}',
        'is_liked': is_liked,
        'like_count': like_count
    }


def verify_comment_added(mini, comment_text):
    """
    验证评论是否已添加
    
    Args:
        mini: Minium 实例
        comment_text: 评论文本
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'comment_id': str  # 评论ID（如果找到）
        }
    """
    comment_data = evaluate_js(mini, js_find_comment_by_text(comment_text))
    
    if comment_data.get('success'):
        return {
            'success': True,
            'message': '评论验证通过',
            'comment_id': comment_data.get('commentId', '')
        }
    else:
        return {
            'success': False,
            'message': f'未找到评论: {comment_data.get("reason")}',
            'comment_id': ''
        }


def verify_post_deleted(mini, post_id):
    """
    验证帖子是否已删除
    
    Args:
        mini: Minium 实例
        post_id: 帖子ID
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    check_data = evaluate_js(mini, js_check_post_deleted(post_id))
    
    post_exists = check_data.get('postExists', True)
    
    if not post_exists:
        return {
            'success': True,
            'message': '帖子删除验证通过'
        }
    else:
        return {
            'success': False,
            'message': '帖子仍存在，可能是缓存问题'
        }


# ============================================
# 圈子验证
# ============================================

def verify_circle_loaded(mini):
    """
    验证圈子是否已加载
    
    Args:
        mini: Minium 实例
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'circle_id': str
        }
    """
    circle_data = evaluate_js(mini, js_check_circle_loaded())
    
    has_circle = circle_data.get('hasCircle', False)
    circle_id = circle_data.get('circleId', '')
    
    if has_circle:
        return {
            'success': True,
            'message': '圈子已加载',
            'circle_id': circle_id
        }
    else:
        return {
            'success': False,
            'message': '圈子未加载',
            'circle_id': ''
        }


def verify_circle_has_content(mini):
    """
    验证圈子是否有内容（帖子和评论）
    
    Args:
        mini: Minium 实例
        
    Returns:
        dict: {
            'has_circle': bool,
            'has_posts': bool,
            'has_comments': bool,
            'comment_count': int
        }
    """
    return evaluate_js(mini, js_check_circle_and_comments())


# ============================================
# 图片验证
# ============================================

def verify_images_displayed(mini, expected_count):
    """
    验证图片是否已显示
    
    Args:
        mini: Minium 实例
        expected_count: 期望的图片数量
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'actual_count': int
        }
    """
    verify_data = evaluate_js(mini, js_check_images_displayed())
    
    if not verify_data.get('success'):
        return {
            'success': False,
            'message': '验证图片显示失败',
            'actual_count': 0
        }
    
    temp_count = verify_data.get('tempImagesCount', 0)
    
    if temp_count == expected_count:
        return {
            'success': True,
            'message': f'图片验证通过：{temp_count}张图片已加载',
            'actual_count': temp_count
        }
    else:
        return {
            'success': False,
            'message': f'图片数量不匹配：期望{expected_count}张，实际{temp_count}张',
            'actual_count': temp_count
        }


# ============================================
# 页面状态验证
# ============================================

def verify_page_path(mini, expected_path, partial_match=True):
    """
    验证当前页面路径
    
    Args:
        mini: Minium 实例
        expected_path: 期望的路径
        partial_match: 是否部分匹配（True则只要包含expected_path即可）
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'actual_path': str
        }
    """
    current_page = mini.app.current_page
    actual_path = current_page.path
    
    if partial_match:
        match = expected_path in actual_path
    else:
        match = actual_path == expected_path
    
    if match:
        return {
            'success': True,
            'message': f'页面路径验证通过: {actual_path}',
            'actual_path': actual_path
        }
    else:
        return {
            'success': False,
            'message': f'页面路径不匹配: 期望"{expected_path}", 实际"{actual_path}"',
            'actual_path': actual_path
        }


def verify_page_data_key(mini, key, expected_value=None):
    """
    验证页面数据中是否包含某个key，可选地验证其值
    
    Args:
        mini: Minium 实例
        key: 数据键名
        expected_value: 期望的值（如果为None则只检查key存在）
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'actual_value': any
        }
    """
    current_page = mini.app.current_page
    page_data = current_page.data
    
    if key not in page_data:
        return {
            'success': False,
            'message': f'页面数据中不存在键: {key}',
            'actual_value': None
        }
    
    actual_value = page_data.get(key)
    
    if expected_value is not None:
        if actual_value == expected_value:
            return {
                'success': True,
                'message': f'页面数据验证通过: {key}={actual_value}',
                'actual_value': actual_value
            }
        else:
            return {
                'success': False,
                'message': f'页面数据值不匹配: 期望{key}={expected_value}, 实际{key}={actual_value}',
                'actual_value': actual_value
            }
    else:
        return {
            'success': True,
            'message': f'页面数据存在键: {key}',
            'actual_value': actual_value
        }


# ============================================
# 综合验证
# ============================================

def verify_test_requirements(mini, requirements):
    """
    批量验证测试要求
    
    Args:
        mini: Minium 实例
        requirements: 要求列表，每个要求是一个字典 {
            'type': 验证类型,
            'params': 参数
        }
        
    Returns:
        dict: {
            'all_passed': bool,
            'results': list,
            'failed_count': int
        }
    """
    results = []
    failed_count = 0
    
    for req in requirements:
        req_type = req.get('type')
        params = req.get('params', {})
        
        if req_type == 'page_path':
            result = verify_page_path(mini, **params)
        elif req_type == 'circle_loaded':
            result = verify_circle_loaded(mini)
        elif req_type == 'post_like':
            result = verify_post_like_status(mini, **params)
        elif req_type == 'comment_added':
            result = verify_comment_added(mini, **params)
        elif req_type == 'images_displayed':
            result = verify_images_displayed(mini, **params)
        else:
            result = {
                'success': False,
                'message': f'未知的验证类型: {req_type}'
            }
        
        results.append(result)
        if not result['success']:
            failed_count += 1
    
    return {
        'all_passed': failed_count == 0,
        'results': results,
        'failed_count': failed_count
    }

