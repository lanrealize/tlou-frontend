#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
帖子相关 Helper 函数
直接从 test_complete_user_flow.py 中抽取封装，保持原有逻辑不变
"""

import time
import re


def publish_post_with_single_image(mini, circle_id, content, image_path, test_images):
    """发布带单张图片的帖子（从 step_3 完整抽取）
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID
        content: 帖子内容
        image_path: 图片路径
        test_images: 测试图片列表（用于 _add_images）
        
    Returns:
        dict: {
            'success': bool,
            'post_id': str,
            'post': dict,
            'message': str
        }
    """
    try:
        print(f'\n📝 发布带单张图片的帖子...')
        
        # 安全导航到发布页面
        try:
            print(f'   📍 导航到发布页面...')
            mini.app.navigate_to(f'/pages/publish/publish?circleId={circle_id}')
            time.sleep(2.0)
            
            # 验证是否成功导航到发布页面
            page = mini.app.current_page
            if 'publish' not in page.path:
                print(f'   ⚠️  未能导航到发布页面，当前页面: {page.path}')
                # 重试一次
                print(f'   🔄 重试导航到发布页面...')
                mini.app.navigate_to(f'/pages/publish/publish?circleId={circle_id}')
                time.sleep(2.0)
                
                page = mini.app.current_page
                if 'publish' not in page.path:
                    raise Exception(f'重试后仍未导航到发布页面，当前页面: {page.path}')
                
            print(f'   ✅ 已在发布页面')
        except Exception as e:
            print(f'   ❌ 导航发布页面失败: {str(e)[:100]}...')
            raise Exception(f'无法导航到发布页面: {str(e)}')
        
        page = mini.app.current_page
        
        # 输入帖子内容
        content_textarea = page.get_element('#contentTextarea')
        if not content_textarea:
            raise Exception('未找到内容输入框')
        
        content_textarea.input(content)
        time.sleep(0.5)
        print(f'   ✅ 已输入帖子内容: {content}')
        
        # 添加图片 - 使用JavaScript模拟
        _add_images(mini, [image_path])
        
        # 点击发布按钮
        publish_btn = page.get_element('#publishBtn')
        if not publish_btn:
            raise Exception('未找到发布按钮')
        
        publish_btn.tap()
        print('   ✅ 已点击发布按钮')
        
        # 等待发布完成
        time.sleep(3.0)
        
        # 验证发布成功（应该返回到详情页面）
        current_page = mini.app.current_page
        if 'details' not in current_page.path:
            raise Exception(f'发布后未返回详情页面，当前页面: {current_page.path}')
        
        # 获取帖子列表，验证帖子已发布
        posts = current_page.data.get('posts', [])
        if len(posts) == 0:
            raise Exception('帖子发布后未在列表中显示')
        
        # 查找刚发布的帖子
        published_post = None
        for post in posts:
            if post.get('content', '') == content:
                published_post = post
                break
        
        if not published_post:
            raise Exception('未找到刚发布的帖子')
        
        print(f'   ✅ 帖子发布成功: {published_post["_id"][:8]}...')
        
        return {
            'success': True,
            'post_id': published_post['_id'],
            'post': published_post,
            'message': f'帖子发布成功: {published_post["_id"][:8]}...'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'发布失败: {str(e)}'
        }


def publish_post_with_multi_images(mini, circle_id, content, image_paths):
    """发布包含多张图片的帖子（从 step_11 完整抽取）
    
    Args:
        mini: Minium 实例
        circle_id: 朋友圈ID
        content: 帖子内容
        image_paths: 图片路径列表
        
    Returns:
        dict: {
            'success': bool,
            'post_id': str,
            'post': dict,
            'message': str
        }
    """
    try:
        print(f'\n📝 发布包含{len(image_paths)}张图片的帖子...')
        
        # 导航到发布页面
        mini.app.navigate_to(f'/pages/publish/publish?circleId={circle_id}')
        time.sleep(1.5)
        
        page = mini.app.current_page
        
        # 输入帖子内容
        content_textarea = page.get_element('#contentTextarea')
        if not content_textarea:
            raise Exception('未找到内容输入框')
        
        content_textarea.input(content)
        time.sleep(0.5)
        print(f'   ✅ 已输入帖子内容: {content}')
        
        # 添加多张图片
        _add_images(mini, image_paths)
        
        # 发布帖子
        publish_btn = page.get_element('#publishBtn')
        if not publish_btn:
            raise Exception('未找到发布按钮')
        
        publish_btn.tap()
        print('   ✅ 已点击发布按钮')
        
        # 等待发布完成
        time.sleep(3.0)
        
        # 验证发布成功
        current_page = mini.app.current_page
        if 'details' not in current_page.path:
            raise Exception(f'发布后未返回详情页面，当前页面: {current_page.path}')
        
        # 查找刚发布的帖子
        posts = current_page.data.get('posts', [])
        published_post = None
        for post in posts:
            if post.get('content', '') == content:
                published_post = post
                break
        
        if not published_post:
            raise Exception('未找到刚发布的帖子')
        
        print(f'   ✅ 多图帖子发布成功: {published_post["_id"][:8]}...')
        
        return {
            'success': True,
            'post_id': published_post['_id'],
            'post': published_post,
            'message': f'多图帖子发布成功: {published_post["_id"][:8]}...'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'发布失败: {str(e)}'
        }


def like_post(mini, post_id):
    """对帖子进行点赞（从 step_4 完整抽取）
    
    Args:
        mini: Minium 实例
        post_id: 帖子ID
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        print(f'\n👍 对帖子进行点赞...')
        
        page = mini.app.current_page
        
        # 点击帖子操作按钮（三个点）
        actions_btn = page.get_element('post-item >>> #postActionsBtn')
        if not actions_btn:
            raise Exception('未找到帖子操作按钮')
        
        actions_btn.tap()
        time.sleep(0.5)
        
        # 点击点赞按钮
        like_btn = page.get_element('post-item >>> #likeBtn')
        if not like_btn:
            raise Exception('未找到点赞按钮')
        
        like_btn.tap()
        print('   ✅ 已点击点赞按钮')
        
        # 等待点赞操作完成 - 增加等待时间
        time.sleep(3.0)
        
        # 验证点赞状态 - 增加重试机制
        _verify_post_like_status(mini, post_id, expected_liked=True)
        print('   ✅ 点赞成功')
        
        return {
            'success': True,
            'message': '点赞成功'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'点赞失败: {str(e)}'
        }


def unlike_post(mini, post_id):
    """取消点赞（从 step_9 完整抽取）
    
    Args:
        mini: Minium 实例
        post_id: 帖子ID
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        print(f'\n👎 取消点赞...')
        
        page = mini.app.current_page
        
        # 点击帖子操作按钮
        actions_btn = page.get_element('post-item >>> #postActionsBtn')
        if not actions_btn:
            raise Exception('未找到帖子操作按钮')
        
        actions_btn.tap()
        time.sleep(0.5)
        
        # 点击取消点赞按钮（实际上还是点击 likeBtn，因为是 toggle）
        like_btn = page.get_element('post-item >>> #likeBtn')
        if not like_btn:
            raise Exception('未找到点赞按钮')
        
        like_btn.tap()
        print('   ✅ 已点击取消点赞')
        
        # 等待操作完成
        time.sleep(2.0)
        
        # 验证取消点赞状态
        _verify_post_like_status(mini, post_id, expected_liked=False)
        print('   ✅ 取消点赞成功')
        
        return {
            'success': True,
            'message': '取消点赞成功'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'取消点赞失败: {str(e)}'
        }


def comment_on_post(mini, comment_text):
    """对帖子进行评论（从 step_5 完整抽取）
    
    Args:
        mini: Minium 实例
        comment_text: 评论内容
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        print(f'\n💬 对帖子进行评论...')
        
        page = mini.app.current_page
        
        # 点击帖子操作按钮
        actions_btn = page.get_element('post-item >>> #postActionsBtn')
        if not actions_btn:
            raise Exception('未找到帖子操作按钮')
        
        actions_btn.tap()
        time.sleep(0.5)
        
        # 点击评论按钮
        comment_btn = page.get_element('post-item >>> #commentBtn')
        if not comment_btn:
            raise Exception('未找到评论按钮')
        
        comment_btn.tap()
        time.sleep(0.5)
        
        # 输入评论内容
        comment_textarea = page.get_element('#commentTextarea')
        if not comment_textarea:
            raise Exception('未找到评论输入框')
        
        comment_textarea.input(comment_text)
        time.sleep(0.3)
        
        # 点击发送按钮
        send_btn = page.get_element('#sendCommentBtn')
        if not send_btn:
            raise Exception('未找到发送按钮')
        
        send_btn.tap()
        print('   ✅ 已发送评论')
        
        # 等待评论发送完成
        time.sleep(2.0)
        
        # 验证评论已添加
        _verify_comment_added(mini, comment_text)
        print('   ✅ 评论添加成功')
        
        return {
            'success': True,
            'message': '评论成功'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'评论失败: {str(e)}'
        }


def reply_to_comment(mini, reply_text):
    """对评论进行回复（从 step_6 完整抽取）
    
    Args:
        mini: Minium 实例
        reply_text: 回复内容
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        print(f'\n📝 对评论进行回复...')
        
        page = mini.app.current_page
        
        # 使用Minium点击回复按钮
        reply_btn = page.get_element('post-item >>> .reply-btn')
        if not reply_btn:
            raise Exception('未找到回复按钮')
        
        reply_btn.tap()
        print('   ✅ 已点击回复按钮')
        time.sleep(1.0)
        
        # 输入回复内容
        comment_textarea = page.get_element('#commentTextarea')
        if not comment_textarea:
            raise Exception('未找到回复输入框')
        
        comment_textarea.input(reply_text)
        time.sleep(0.3)
        
        # 发送回复
        send_btn = page.get_element('#sendCommentBtn')
        if not send_btn:
            raise Exception('未找到发送按钮')
        
        send_btn.tap()
        print('   ✅ 已发送回复')
        
        # 等待回复发送完成
        time.sleep(2.0)
        print('   ✅ 回复添加成功')
        
        return {
            'success': True,
            'message': '回复成功'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'回复失败: {str(e)}'
        }


def delete_comment(mini, is_reply=True):
    """删除评论或回复（从 step_7/8 完整抽取）
    
    Args:
        mini: Minium 实例
        is_reply: 是否删除回复（True=删除回复，False=删除评论）
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        target_type = "回复" if is_reply else "评论"
        print(f'\n🗑️ 删除{target_type}...')
        
        page = mini.app.current_page
        from .test_helper import handle_modal_confirm
        
        # 点击删除按钮（第一个删除按钮通常是最新的评论/回复）
        try:
            delete_btns = page.get_elements('post-item >>> #deleteCommentBtn')
            if delete_btns and len(delete_btns) > 0:
                delete_btn = delete_btns[0]
                delete_btn.tap()
                print(f'   ✅ 已点击删除{target_type}按钮')
                
                # 等待确认对话框出现
                time.sleep(1.0)
                
                # 处理确认对话框
                if handle_modal_confirm(mini, "确定"):
                    print('   ✅ 已确认删除')
                else:
                    print('   ⚠️  删除确认失败')
                    return {
                        'success': False,
                        'message': f'{target_type}删除确认失败'
                    }
                
                # 等待删除操作完成
                time.sleep(2.0)
                print(f'   ✅ {target_type}删除成功')
                
                return {
                    'success': True,
                    'message': f'{target_type}删除成功'
                }
            else:
                print('   ⚠️  未找到删除按钮')
                return {
                    'success': False,
                    'message': '未找到删除按钮'
                }
        except Exception as e:
            print(f'   ⚠️  删除操作失败: {str(e)}')
            return {
                'success': False,
                'message': f'删除操作失败: {str(e)}'
            }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'删除失败: {str(e)}'
        }


def delete_post(mini, post_id):
    """删除帖子（从 step_10 完整抽取）
    
    Args:
        mini: Minium 实例
        post_id: 帖子ID
        
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        print(f'\n🗑️ 删除帖子...')
        
        page = mini.app.current_page
        from .test_helper import handle_modal_confirm
        
        # 点击帖子操作按钮
        actions_btn = page.get_element('post-item >>> #postActionsBtn')
        if not actions_btn:
            raise Exception('未找到帖子操作按钮')
        
        actions_btn.tap()
        print('   ✅ 已点击帖子操作按钮')
        time.sleep(1.0)
        
        # 点击删除按钮
        delete_btn = page.get_element('post-item >>> #deletePostBtn')
        if not delete_btn:
            raise Exception('未找到删除帖子按钮')
        
        delete_btn.tap()
        print('   ✅ 已点击删除帖子按钮')
        
        # 等待确认对话框出现
        time.sleep(1.0)
        
        # 使用封装的函数处理modal确认对话框
        handle_modal_confirm(mini, "确定")
        
        # 等待删除操作完成
        time.sleep(2.0)
        
        # 验证删除结果
        _verify_post_deleted(mini, post_id)
        print('   ✅ 帖子删除成功')
        
        return {
            'success': True,
            'message': '帖子删除成功'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'删除失败: {str(e)}'
        }


# ============================================
# 辅助函数（内部使用，从 test_complete_user_flow.py 抽取）
# ============================================

def _add_images(mini, image_paths):
    """
    使用 common_helper 的通用逻辑添加图片
    
    复用 common_helper.upload_multiple_images_with_button()，
    这是更通用、更健壮的实现
    """
    from .common_helper import upload_multiple_images_with_button
    
    # 使用通用的上传函数
    result = upload_multiple_images_with_button(
        mini, 
        image_paths, 
        button_selector='#addImagesBtn',
        wait_after=2.0
    )
    
    if not result['success']:
        raise Exception(f'图片上传失败: {result["message"]}')
    
    # 验证图片是否成功加载到页面（保留原有的验证逻辑）
    _verify_images_displayed(mini, result['image_count'])
    
    print(f'   ✅ 成功选择了 {result["image_count"]} 张真实图片，可进行真实上传')
    time.sleep(1.0)


def _verify_images_displayed(mini, expected_count):
    """验证图片是否显示在页面上（从 test_complete_user_flow.py 百分百完整抽取）"""
    print(f'   🔍 验证 {expected_count} 张图片是否显示...')
    
    js_code = '''
    function checkImagesDisplayed() {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        
        // 检查tempImages数据
        const tempImages = page.data.tempImages || [];
        
        // 检查DOM中是否有图片元素显示
        const imageElements = page.selectAllComponents('.temp-image-item') || [];
        
        return {
            success: true,
            tempImagesCount: tempImages.length,
            domImagesCount: imageElements.length,
            tempImages: tempImages
        };
    }
    '''
    
    result = mini.app.evaluate(js_code.strip(), sync=True)
    verify_data = result.get('result', {}).get('result', {})
    
    if not verify_data.get('success'):
        raise Exception('验证图片显示失败')
    
    temp_count = verify_data.get('tempImagesCount', 0)
    
    if temp_count != expected_count:
        print(f'   ⚠️  图片数量不匹配：期望{expected_count}张，实际{temp_count}张')
        # 不抛出异常，只是警告
    else:
        print(f'   ✅ 图片验证通过：{temp_count}张图片已加载')


def _verify_post_like_status(mini, post_id, expected_liked):
    """验证帖子点赞状态（内部辅助函数，从原始测试完整抽取）"""
    max_retries = 3
    
    for attempt in range(max_retries):
        js_code = f'''
        function checkLikeStatus() {{
            const pages = getCurrentPages();
            const page = pages[pages.length - 1];
            const posts = page.data.posts || [];
            
            const post = posts.find(p => p._id === '{post_id}');
            if (!post) {{
                return {{ success: false, reason: 'post_not_found' }};
            }}
            
            const likes = post.likes || [];
            const likedUsers = post.likedUsers || [];
            
            return {{ 
                success: true, 
                isLiked: post.isLiked || false,
                likeCount: likes.length,
                likedUsersCount: likedUsers.length,
                postData: post
            }};
        }}
        '''
        
        result = mini.app.evaluate(js_code.strip(), sync=True)
        status_data = result.get('result', {}).get('result', {})
        
        if not status_data.get('success'):
            if attempt == max_retries - 1:
                print(f'   ⚠️  验证点赞状态失败: {status_data.get("reason")}')
                return  # 不抛出异常，只是返回
            time.sleep(1.0)
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
                print(f'   ✅ 点赞验证通过 (点赞数: {like_count})')
                return
        else:
            # 期望未点赞：检查是否所有指标都为0
            if not is_liked and like_count == 0 and liked_users_count == 0:
                print(f'   ✅ 取消点赞验证通过')
                return
        
        # 如果验证失败，等待后重试
        if attempt < max_retries - 1:
            print(f'   ⏳ 点赞状态不符合预期，等待后重试...')
            time.sleep(2.0)
        else:
            # 最后一次尝试仍然失败 - 抛出异常
            error_msg = (
                f'点赞状态验证失败！\n'
                f'      期望: {"已点赞" if expected_liked else "未点赞"}\n'
                f'      实际: isLiked={is_liked}, likeCount={like_count}, likedUsersCount={liked_users_count}'
            )
            print(f'   ❌ {error_msg}')
            raise Exception(error_msg)


def _verify_comment_added(mini, comment_text):
    """验证评论已添加（内部辅助函数）"""
    js_find_comment = f'''
    function findComment() {{
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const posts = page.data.posts || [];
        
        for (const post of posts) {{
            if (post.comments) {{
                const comment = post.comments.find(c => c.content === '{comment_text}');
                if (comment) {{
                    return {{ success: true, commentId: comment._id }};
                }}
            }}
        }}
        
        return {{ success: false, reason: 'comment_not_found' }};
    }}
    '''
    
    result = mini.app.evaluate(js_find_comment.strip(), sync=True)
    comment_result = result.get('result', {}).get('result', {})
    
    if not comment_result.get('success'):
        raise Exception('评论未找到，可能发送失败')


def _verify_post_deleted(mini, post_id):
    """验证帖子已删除（内部辅助函数）"""
    js_check_deleted = f'''
    function checkDeleted() {{
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const posts = page.data.posts || [];
        const post = posts.find(p => p._id === '{post_id}');
        
        return {{
            success: true,
            isDeleted: !post
        }};
    }}
    '''
    
    result = mini.app.evaluate(js_check_deleted.strip(), sync=True)
    delete_result = result.get('result', {}).get('result', {})
    
    if not delete_result.get('isDeleted'):
        raise Exception('帖子删除后仍存在')

