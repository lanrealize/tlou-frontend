#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
帖子操作辅助工具 - 封装发帖、点赞、评论等常用操作
"""

import time
import os
import base64
from .element_helpers import find_element_safe, input_text_safe, tap_element_safe
from .validation_helpers import verify_images_displayed
from .js_helpers import js_check_images_displayed, evaluate_js


# ============================================
# 图片上传
# ============================================

def add_images_to_post(mini, image_paths, wait_after=2.0):
    """
    添加图片到发布页面（使用真实图片文件）
    
    Args:
        mini: Minium 实例
        image_paths: 图片文件路径列表
        wait_after: 添加后等待时间
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'added_count': int
        }
    """
    try:
        print(f'   📸 准备添加 {len(image_paths)} 张图片...')
        
        # 1. 检查测试图片是否存在
        real_images = []
        for path in image_paths:
            if os.path.exists(path):
                real_images.append(path)
                size_kb = round(os.path.getsize(path) / 1024, 1)
                print(f'   📄 找到测试图片: {os.path.basename(path)} ({size_kb}KB)')
            else:
                print(f'   ⚠️  图片不存在: {path}')
        
        if not real_images:
            return {
                'success': False,
                'message': '没有可用的测试图片文件',
                'added_count': 0
            }
        
        # 2. 使用Minium Mock选择真实图片
        try:
            print(f'   🎯 设置Minium Mock ({len(real_images)}张图片)')
            
            mock_images_data = []
            for path in real_images:
                image_name = os.path.basename(path)
                with open(path, 'rb') as img_file:
                    b64_data = base64.b64encode(img_file.read()).decode('utf-8')
                
                mock_images_data.append({
                    "name": image_name,
                    "b64data": b64_data
                })
            
            mini.app.mock_choose_images(mock_images_data)
            print('   ✅ Minium Mock设置成功')
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Mock设置失败: {str(e)}',
                'added_count': 0
            }
        
        # 3. 点击添加图片按钮
        page = mini.app.current_page
        try:
            tap_element_safe(page, '#addImagesBtn', wait_after=0.5)
            print('   ✅ 已点击添加图片按钮')
        except Exception as e:
            return {
                'success': False,
                'message': f'点击添加按钮失败: {str(e)}',
                'added_count': 0
            }
        
        # 4. 等待图片选择和处理完成
        time.sleep(wait_after)
        
        # 5. 验证图片是否成功加载
        verify_result = verify_images_displayed(mini, len(real_images))
        
        if not verify_result['success']:
            print(f'   ⚠️  {verify_result["message"]}')
        else:
            print(f'   ✅ {verify_result["message"]}')
        
        return {
            'success': True,
            'message': f'成功添加 {len(real_images)} 张图片',
            'added_count': len(real_images)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'添加图片失败: {str(e)}',
            'added_count': 0
        }


# ============================================
# 发布帖子
# ============================================

def publish_post(mini, circle_id, content, image_paths=None, wait_after=3.0):
    """
    发布帖子（完整流程：导航、输入、添加图片、发布）
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID
        content: 帖子内容
        image_paths: 图片路径列表（可选）
        wait_after: 发布后等待时间
        
    Returns:
        dict: {
            'success': bool,
            'message': str,
            'post_id': str,
            'post': dict
        }
    """
    try:
        # 1. 导航到发布页面
        print(f'   📍 导航到发布页面...')
        mini.app.navigate_to(f'/pages/publish/publish?circleId={circle_id}')
        time.sleep(2.0)
        
        page = mini.app.current_page
        if 'publish' not in page.path:
            return {
                'success': False,
                'message': f'未能导航到发布页面，当前页面: {page.path}',
                'post_id': '',
                'post': None
            }
        
        print('   ✅ 已在发布页面')
        
        # 2. 输入帖子内容
        input_text_safe(page, '#contentTextarea', content)
        print(f'   ✅ 已输入帖子内容')
        
        # 3. 添加图片（如果提供）
        if image_paths:
            add_result = add_images_to_post(mini, image_paths)
            if not add_result['success']:
                print(f'   ⚠️  {add_result["message"]}')
        
        # 4. 点击发布按钮
        tap_element_safe(page, '#publishBtn', wait_after=0.5)
        print('   ✅ 已点击发布按钮')
        
        # 5. 等待发布完成
        time.sleep(wait_after)
        
        # 6. 验证发布成功（应该返回到详情页面）
        current_page = mini.app.current_page
        if 'details' not in current_page.path:
            return {
                'success': False,
                'message': f'发布后未返回详情页面，当前页面: {current_page.path}',
                'post_id': '',
                'post': None
            }
        
        # 7. 获取帖子列表，查找刚发布的帖子
        posts = current_page.data.get('posts', [])
        if len(posts) == 0:
            return {
                'success': False,
                'message': '帖子发布后未在列表中显示',
                'post_id': '',
                'post': None
            }
        
        # 查找刚发布的帖子
        published_post = None
        for post in posts:
            if post.get('content', '') == content:
                published_post = post
                break
        
        if not published_post:
            return {
                'success': False,
                'message': '未找到刚发布的帖子',
                'post_id': '',
                'post': None
            }
        
        post_id = published_post['_id']
        print(f'   ✅ 帖子发布成功: {post_id[:8]}...')
        
        return {
            'success': True,
            'message': '帖子发布成功',
            'post_id': post_id,
            'post': published_post
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'发布帖子失败: {str(e)}',
            'post_id': '',
            'post': None
        }


# ============================================
# 帖子操作（点赞、评论、删除）
# ============================================

def like_post(mini, post_index=0, wait_after=3.0):
    """
    点赞帖子
    
    Args:
        mini: Minium 实例
        post_index: 帖子索引（默认第一个）
        wait_after: 操作后等待时间
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        page = mini.app.current_page
        
        # 点击帖子操作按钮（三个点）
        actions_btn = find_element_safe(page, 'post-item >>> #postActionsBtn', required=True)
        actions_btn.tap()
        time.sleep(0.5)
        
        # 点击点赞按钮
        like_btn = find_element_safe(page, 'post-item >>> #likeBtn', required=True)
        like_btn.tap()
        print('   ✅ 已点击点赞按钮')
        
        # 等待操作完成
        time.sleep(wait_after)
        
        return {
            'success': True,
            'message': '点赞操作完成'
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'点赞失败: {str(e)}'
        }


def comment_on_post(mini, comment_text, post_index=0, wait_after=2.0):
    """
    评论帖子
    
    Args:
        mini: Minium 实例
        comment_text: 评论内容
        post_index: 帖子索引（默认第一个）
        wait_after: 操作后等待时间
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        page = mini.app.current_page
        
        # 点击帖子操作按钮
        actions_btn = find_element_safe(page, 'post-item >>> #postActionsBtn', required=True)
        actions_btn.tap()
        time.sleep(0.5)
        
        # 点击评论按钮
        comment_btn = find_element_safe(page, 'post-item >>> #commentBtn', required=True)
        comment_btn.tap()
        time.sleep(0.5)
        
        # 输入评论内容
        input_text_safe(page, '#commentTextarea', comment_text, wait_after=0.3)
        
        # 点击发送按钮
        tap_element_safe(page, '#sendCommentBtn', wait_after=0.2)
        print('   ✅ 已发送评论')
        
        # 等待评论发送完成
        time.sleep(wait_after)
        
        return {
            'success': True,
            'message': '评论发送成功'
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'评论失败: {str(e)}'
        }


def reply_to_comment(mini, reply_text, comment_index=0, wait_after=2.0):
    """
    回复评论
    
    Args:
        mini: Minium 实例
        reply_text: 回复内容
        comment_index: 评论索引（默认第一个）
        wait_after: 操作后等待时间
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        page = mini.app.current_page
        
        # 使用Minium点击回复按钮
        reply_btn = find_element_safe(page, 'post-item >>> .reply-btn', required=True)
        reply_btn.tap()
        print('   ✅ 已点击回复按钮')
        time.sleep(1.0)
        
        # 输入回复内容
        input_text_safe(page, '#commentTextarea', reply_text, wait_after=0.3)
        
        # 发送回复
        tap_element_safe(page, '#sendCommentBtn', wait_after=0.2)
        print('   ✅ 已发送回复')
        
        # 等待回复发送完成
        time.sleep(wait_after)
        
        return {
            'success': True,
            'message': '回复发送成功'
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'回复失败: {str(e)}'
        }


def delete_post(mini, confirm=True, wait_after=2.0):
    """
    删除帖子
    
    Args:
        mini: Minium 实例
        confirm: 是否自动确认删除对话框
        wait_after: 操作后等待时间
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        page = mini.app.current_page
        
        # 点击帖子操作按钮
        actions_btn = find_element_safe(page, 'post-item >>> #postActionsBtn', required=True)
        actions_btn.tap()
        print('   ✅ 已点击帖子操作按钮')
        time.sleep(1.0)
        
        # 点击删除按钮
        delete_btn = find_element_safe(page, 'post-item >>> #deletePostBtn', required=True)
        delete_btn.tap()
        print('   ✅ 已点击删除帖子按钮')
        
        # 等待确认对话框出现
        time.sleep(1.0)
        
        # 处理确认对话框
        if confirm:
            from .test_helper import handle_modal_confirm
            handle_modal_confirm(mini, "确定")
        
        # 等待删除操作完成
        time.sleep(wait_after)
        
        return {
            'success': True,
            'message': '删除操作完成'
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'删除失败: {str(e)}'
        }


def delete_comment(mini, comment_index=0, confirm=True, wait_after=2.0):
    """
    删除评论或回复
    
    Args:
        mini: Minium 实例
        comment_index: 删除按钮索引（默认第一个）
        confirm: 是否自动确认删除对话框
        wait_after: 操作后等待时间
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        page = mini.app.current_page
        
        # 点击删除按钮
        delete_btns = page.get_elements('post-item >>> #deleteCommentBtn')
        if not delete_btns or len(delete_btns) <= comment_index:
            return {
                'success': False,
                'message': '未找到删除按钮'
            }
        
        delete_btn = delete_btns[comment_index]
        delete_btn.tap()
        print('   ✅ 已点击删除按钮')
        
        # 等待确认对话框出现
        time.sleep(1.0)
        
        # 处理确认对话框
        if confirm:
            from .test_helper import handle_modal_confirm
            handle_modal_confirm(mini, "确定")
        
        # 等待删除操作完成
        time.sleep(wait_after)
        
        return {
            'success': True,
            'message': '删除操作完成'
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'删除失败: {str(e)}'
        }

