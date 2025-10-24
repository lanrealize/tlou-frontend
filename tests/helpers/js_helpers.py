#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JavaScript 辅助工具 - 封装常用的 JavaScript 代码片段

这个模块提供了一系列返回 JavaScript 代码字符串的函数，
用于在测试中通过 mini.app.evaluate() 执行。
"""


# ============================================
# 用户状态相关
# ============================================

def js_get_login_status():
    """获取用户登录状态"""
    return """
    function checkLoginStatus() {
        const app = getApp();
        const userStore = app.getUserStore();
        return {
            loginStatus: userStore.loginStatus,
            isLoggedIn: userStore.loginStatus === 'loggedIn',
            username: userStore.userInfo?.username || '',
            userId: userStore.userInfo?._id || '',
            userInfo: userStore.userInfo
        };
    }
    """


def js_get_user_circles():
    """从用户信息获取朋友圈列表"""
    return """
    function getUserCircles() {
        try {
            const app = getApp();
            const userStore = app.getUserStore();
            
            if (userStore && userStore.userInfo && userStore.userInfo.circles) {
                const circles = userStore.userInfo.circles;
                return { 
                    success: true, 
                    circles: circles,
                    count: circles.length
                };
            }
            
            return { success: false, reason: 'no_circles_in_user_info' };
        } catch (e) {
            return { success: false, reason: e.message };
        }
    }
    """


# ============================================
# 弹窗相关
# ============================================

def js_check_popup_visible():
    """检查 user-info-popup 是否显示"""
    return """
    function checkUserInfoPopup() {
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        
        if (!currentPage || !currentPage.data) {
            return { visible: false, reason: '' };
        }
        
        const visible = currentPage.data.userInfoPopupVisible === true;
        const reason = currentPage.data.userInfoPopupReason || '';
        
        return { visible: visible, reason: reason };
    }
    """


def js_close_popup():
    """关闭弹窗"""
    return """
    function closePopupByMask() {
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (!currentPage || !currentPage.data) {
            return { success: false, reason: 'no_page' };
        }
        
        if (!currentPage.data.userInfoPopupVisible) {
            return { success: false, reason: 'not_visible' };
        }
        
        // 方法1：直接调用页面的 onUserInfoClose 方法（最可靠）
        if (currentPage.onUserInfoClose) {
            currentPage.onUserInfoClose();
            console.log('[TEST] 已通过页面方法关闭弹窗');
            return { success: true, reason: 'closed_by_page_method' };
        }
        
        // 方法2：直接设置 data（备用方案）
        currentPage.setData({
            userInfoPopupVisible: false
        });
        console.log('[TEST] 已通过 setData 关闭弹窗');
        return { success: true, reason: 'closed_by_setdata' };
    }
    """


# ============================================
# 页面导航相关
# ============================================

def js_get_current_page_info():
    """获取当前页面信息"""
    return """
    function getCurrentPageInfo() {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        return {
            path: page.route,
            query: page.options,
            data: {
                hasCircle: !!(page.data.circle && page.data.circle._id),
                hasPosts: !!(page.data.posts && page.data.posts.length > 0)
            }
        };
    }
    """


def js_get_circle_id_from_page():
    """从当前页面获取朋友圈ID"""
    return """
    function getCircleIdFromPage() {
        try {
            const pages = getCurrentPages();
            for (let i = pages.length - 1; i >= 0; i--) {
                const page = pages[i];
                // 从 URL 参数获取
                if (page.route && page.route.includes('details') && page.options && page.options.circleId) {
                    return { success: true, circleId: page.options.circleId, source: 'page_options' };
                }
                // 从页面数据获取
                if (page.data && page.data.circle && page.data.circle._id) {
                    return { success: true, circleId: page.data.circle._id, source: 'page_data' };
                }
            }
            return { success: false, reason: 'no_circle_id_found' };
        } catch (e) {
            return { success: false, reason: e.message };
        }
    }
    """


# ============================================
# 帖子操作相关
# ============================================

def js_check_post_like_status(post_id):
    """检查帖子点赞状态"""
    return f"""
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
            likedUsersCount: likedUsers.length
        }};
    }}
    """


def js_find_comment_by_text(comment_text):
    """查找包含指定文本的评论"""
    return f"""
    function checkCommentAdded() {{
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const posts = page.data.posts || [];
        
        for (let post of posts) {{
            const comments = post.comments || [];
            for (let comment of comments) {{
                if (comment.content === '{comment_text}') {{
                    return {{ success: true, commentId: comment._id, postId: post._id }};
                }}
            }}
        }}
        
        return {{ success: false, reason: 'comment_not_found' }};
    }}
    """


def js_check_post_deleted(post_id):
    """检查帖子是否已删除"""
    return f"""
    function checkPostDeleted() {{
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const posts = page.data.posts || [];
        
        // 检查帖子是否还存在
        const postExists = posts.some(post => post._id === '{post_id}');
        
        return {{ 
            success: true, 
            postExists: postExists,
            totalPosts: posts.length 
        }};
    }}
    """


# ============================================
# 组件交互相关
# ============================================

def js_mock_avatar_upload(avatar_url):
    """模拟头像上传成功"""
    return f"""
    function mockAvatarSuccess() {{
        try {{
            const pages = getCurrentPages();
            const page = pages[pages.length - 1];
            const comp = page.selectComponent('#userInfoPopup');
            
            if (!comp) {{
                return {{ success: false, reason: 'component_not_found' }};
            }}
            
            // 直接设置组件状态，模拟上传成功
            comp.setData({{
                avatarUrl: '{avatar_url}',
                isUploadingAvatar: false
            }}, () => {{
                // 触发检查提交按钮状态
                comp.checkCanSubmit();
            }});
            
            return {{ 
                success: true,
                canSubmit: comp.data.canSubmit,
                avatarUrl: comp.data.avatarUrl
            }};
        }} catch (e) {{
            return {{ success: false, reason: e.message }};
        }}
    }}
    """


def js_check_submit_button_enabled():
    """检查提交按钮是否启用"""
    return """
    function checkCanSubmit() {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const comp = page.selectComponent('#userInfoPopup');
        
        return {
            canSubmit: comp.data.canSubmit,
            isUploading: comp.data.isUploadingAvatar,
            avatarUrl: comp.data.avatarUrl
        };
    }
    """


# ============================================
# 图片相关
# ============================================

def js_check_images_displayed():
    """检查图片是否已显示在页面上"""
    return """
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
    """


# ============================================
# 圈子状态相关
# ============================================

def js_check_circle_loaded():
    """检查圈子是否已加载"""
    return """
    function checkCircleLoaded() {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        return {
            hasCircle: !!(page.data.circle && page.data.circle._id),
            circleId: page.data.circle?._id || ''
        };
    }
    """


def js_check_circle_and_comments():
    """检查圈子和评论数据"""
    return """
    function checkCircleAndComments() {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        
        const hasCircle = !!(page.data.circle && page.data.circle._id);
        const hasPosts = !!(page.data.posts && page.data.posts.length > 0);
        
        // 检查是否有评论
        let hasComments = false;
        let commentCount = 0;
        if (hasPosts && page.data.posts) {
            for (const post of page.data.posts) {
                if (post.comments && post.comments.length > 0) {
                    hasComments = true;
                    commentCount += post.comments.length;
                }
            }
        }
        
        return {
            hasCircle: hasCircle,
            hasPosts: hasPosts,
            hasComments: hasComments,
            commentCount: commentCount
        };
    }
    """


# ============================================
# 辅助函数
# ============================================

def evaluate_js(mini, js_function, sync=True):
    """
    执行 JavaScript 代码并返回结果
    
    Args:
        mini: Minium 实例
        js_function: JavaScript 函数字符串
        sync: 是否同步执行
        
    Returns:
        dict: JavaScript 函数返回的结果
    """
    result = mini.app.evaluate(js_function.strip(), sync=sync)
    return result.get('result', {}).get('result', {})

