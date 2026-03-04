const { observable, action } = require('mobx-miniprogram');
const api = require('../utils/api');
const util = require('../utils/util');
const quotaCache = require('../utils/quotaCache');

// 🎯 帖子状态常量定义
const POST_STATUS = {
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  EMPTY: 'empty'
};

// 帖子状态管理Store
const postStore = observable({
  // 🔥 核心状态数据
  status: POST_STATUS.EMPTY,
  posts: [],
  currentCircleId: '',
  errorMessage: '',
  isLoading: false,
  hasMore: true,
  page: 1,
  pageSize: 10,

  // 🎯 统一状态更新接口
  setStatus(status, data = {}) {
    this.status = status;
    this.isLoading = false;
    
    switch (status) {
      case POST_STATUS.LOADED:
        this.posts = data.posts || [];
        this.hasMore = data.hasMore !== undefined ? data.hasMore : true;
        this.page = data.page || 1;
        this.errorMessage = '';
        break;
        
      case POST_STATUS.ERROR:
        this.errorMessage = data.message || '加载帖子失败';
        break;
        
      case POST_STATUS.EMPTY:
        this.posts = [];
        this.hasMore = false;
        this.errorMessage = '';
        break;
        
      case POST_STATUS.LOADING:
        this.isLoading = true;
        break;
    }
  },

  // 🔧 设置当前朋友圈
  setCurrentCircle(circleId) {
    if (this.currentCircleId !== circleId) {
      this.currentCircleId = circleId;
      this.posts = [];
      this.page = 1;
      this.hasMore = true;
  
    }
  },

  // 📋 核心业务方法

  // 加载帖子列表
  async loadPosts(circleId, loadMore = false, extraParams = {}) {
    if (!circleId) {
      this.setStatus(POST_STATUS.ERROR, { message: '朋友圈ID不能为空' });
      return;
    }

    if (this.isLoading) {

      return;
    }

    // 如果是新的朋友圈，重置数据
    if (circleId !== this.currentCircleId) {
      this.setCurrentCircle(circleId);
    }

    // 如果是加载更多但没有更多数据，直接返回
    if (loadMore && !this.hasMore) {

      return;
    }

    this.setStatus(POST_STATUS.LOADING);

    try {
      const currentPage = loadMore ? this.page + 1 : 1;
      // 🆕 合并额外参数（如 inviteCode）
      const response = await api.posts.getList(circleId, {
        page: currentPage,
        limit: this.pageSize,
        ...extraParams
      });

      const newPosts = response.data.posts || [];

      // 冷启动：更新配额快照
      if (response.quota) quotaCache.write(response.quota);
      
      // 格式化帖子数据
      const formattedPosts = this._formatPosts(newPosts);
      
      let allPosts;
      if (loadMore) {
        // 加载更多：合并到现有列表，并去重
        const existingIds = new Set(this.posts.map(p => p._id));
        const newUniquePosts = formattedPosts.filter(p => !existingIds.has(p._id));
        allPosts = [...this.posts, ...newUniquePosts];
      } else {
        // 重新加载：替换现有列表
        allPosts = formattedPosts;
      }

      this.setStatus(POST_STATUS.LOADED, {
        posts: allPosts,
        hasMore: newPosts.length >= this.pageSize,
        page: currentPage
      });

      if (allPosts.length === 0) {
        this.setStatus(POST_STATUS.EMPTY);
      }

    } catch (error) {

      this.setStatus(POST_STATUS.ERROR, { 
        message: error.message || '网络异常，请重试' 
      });
    }
  },

  // 刷新帖子列表
  async refreshPosts(circleId, extraParams = {}) {

    this.page = 1;
    this.hasMore = true;
    await this.loadPosts(circleId, false, extraParams);
  },

  // 加载更多帖子
  async loadMorePosts(extraParams = {}) {
    if (this.currentCircleId && this.hasMore && !this.isLoading) {
  
      await this.loadPosts(this.currentCircleId, true, extraParams);
    }
  },

  // 点赞/取消点赞
  async toggleLike(postId, userInfo) {
    const postIndex = this.posts.findIndex(p => p._id === postId);
    if (postIndex === -1) {

      return;
    }

    // ✅ 后端架构：_id 是用户唯一标识
    if (!userInfo || !userInfo._id) {

      return;
    }

    try {
  
      
      const response = await api.posts.like(postId);
      const liked = response.data.reacted;

      // 更新本地状态 - 创建新对象以触发 MobX 响应式更新
      const updatedPosts = [...this.posts];
      const oldPost = updatedPosts[postIndex];
      
      const currentUserId = userInfo._id.toString();
      const oldLikedUsers = oldPost.likedUsers || [];
      
      // 创建新的点赞用户列表
      let newLikedUsers;
      
      if (liked) {
        // 添加点赞
        const alreadyLiked = oldLikedUsers.some(user => user._id.toString() === currentUserId);
        if (alreadyLiked) {
          newLikedUsers = oldLikedUsers;
        } else {
          newLikedUsers = [...oldLikedUsers, {
            _id: userInfo._id,
            username: userInfo.username,
            avatar: userInfo.avatar
          }];
        }
      } else {
        // 移除点赞
        newLikedUsers = oldLikedUsers.filter(user => user._id.toString() !== currentUserId);
      }
      
      // 创建新的 post 对象（触发响应式更新）
      updatedPosts[postIndex] = {
        ...oldPost,
        likedUsers: newLikedUsers,
        likes: newLikedUsers.map(u => u._id)  // 从 likedUsers 同步生成，保持一致
      };
      
      this.posts = updatedPosts;
      

      
      return { success: true, liked };
    } catch (error) {
      throw error;
    }
  },

  // 添加评论
  async addComment(postId, commentData) {
    // 防重复提交检查
    const commentKey = `${postId}_${Date.now()}`;
    if (this._pendingComments && this._pendingComments.has(commentKey)) {

      return;
    }

    // 初始化待处理评论集合
    if (!this._pendingComments) {
      this._pendingComments = new Set();
    }
    
    this._pendingComments.add(commentKey);

    try {
      const response = await api.posts.addComment(postId, commentData);

      // 本地更新：构建新评论并添加到对应帖子中
      const postIndex = this.posts.findIndex(p => p._id === postId);

      if (postIndex !== -1) {
        try {
          // 获取当前用户信息
          const app = getApp();
          const currentUser = app.getUserStore?.()?.userInfo;

          if (currentUser) {
            // 获取回复目标用户信息
            let replyToUser = null;
            // ✅ 后端参数名：replyToUserOpenid
            if (commentData.replyToUserOpenid) {
              // 从当前评论中查找回复目标用户
              const targetPost = this.posts[postIndex];
              const targetComment = targetPost.comments?.find(c => 
                c.author._id === commentData.replyToUserOpenid
              );
              if (targetComment) {
                replyToUser = {
                  _id: targetComment.author._id,
                  username: targetComment.author.username || targetComment.author.name,
                  name: targetComment.author.name || targetComment.author.username
                };
              } else {
                replyToUser = {
                  _id: commentData.replyToUserOpenid,
                  username: commentData.replyToUsername || '用户',
                  name: commentData.replyToUsername || '用户'
                };
              }
            }
            
            // 构建新评论对象
            const newComment = {
              _id: response.data?.commentId || Date.now().toString(),
              author: {
                _id: currentUser._id,
                username: currentUser.username,
                name: currentUser.name,
                avatar: currentUser.avatar
              },
              content: commentData.content,
              replyTo: replyToUser,
              createdAt: new Date().toISOString(),
              formattedTime: util.formatRelativeTime(new Date()),
              _isNew: true  // 标记为新评论，用于高亮
            };
            // 更新本地帖子数据
            const updatedPosts = [...this.posts];
            const post = updatedPosts[postIndex];
            const updatedComments = [...(post.comments || []), newComment];
            updatedPosts[postIndex] = { ...post, comments: updatedComments };
            this.posts = updatedPosts;

            // 2.5秒后自动清除 _isNew 标记
            const commentId = newComment._id;
            setTimeout(() => {
              this._clearCommentNewFlag(postId, commentId);
            }, 2500);
          } else {
            throw new Error('用户信息不完整');
          }
        } catch (localUpdateError) {
          // 如果本地更新失败，回退到重新加载
          if (this.currentCircleId) {
            await this.refreshPosts(this.currentCircleId);
          }
        }
      } else {
        if (this.currentCircleId) {
          await this.refreshPosts(this.currentCircleId);
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      // 清理防重复提交标记
      if (this._pendingComments) {
        this._pendingComments.delete(commentKey);
      }
    }
  },

  // 清除评论的 _isNew 标记（内部方法）
  _clearCommentNewFlag(postId, commentId) {
    const postIndex = this.posts.findIndex(p => p._id === postId);
    if (postIndex === -1) return;
    
    const post = this.posts[postIndex];
    if (!post.comments) return;
    
    const commentIndex = post.comments.findIndex(c => c._id === commentId);
    if (commentIndex === -1) return;
    
    if (post.comments[commentIndex]._isNew) {
      const updatedPosts = [...this.posts];
      const updatedComments = [...updatedPosts[postIndex].comments];
      updatedComments[commentIndex] = {
        ...updatedComments[commentIndex],
        _isNew: false
      };
      updatedPosts[postIndex] = {
        ...updatedPosts[postIndex],
        comments: updatedComments
      };
      this.posts = updatedPosts;
    }
  },

  // 删除评论
  async deleteComment(postId, commentId) {
    try {
      await api.posts.deleteComment(postId, commentId);
      
      // 本地更新：从对应帖子中删除评论
      const postIndex = this.posts.findIndex(p => p._id === postId);
      if (postIndex !== -1) {
        const updatedPosts = [...this.posts];
        const post = updatedPosts[postIndex];
        
        if (post.comments) {
          post.comments = post.comments.filter(comment => comment._id !== commentId);
        }
        
        this.posts = updatedPosts;

      }
      
    } catch (error) {
      console.error('❌ 删除评论失败:', error);
      throw error;
    }
  },

  // 删除帖子
  async deletePost(postId) {
    try {
      await api.posts.delete(postId);
      
      // 从本地列表中移除
      this.posts = this.posts.filter(p => p._id !== postId);
      
      // 如果删除后列表为空，更新状态
      if (this.posts.length === 0) {
        this.setStatus(POST_STATUS.EMPTY);
      }
      
      console.log('✅ 帖子删除成功');
    } catch (error) {
      console.error('❌ 删除帖子失败:', error);
      throw error;
    }
  },

  // 🚀 乐观更新：添加临时帖子到列表顶部
  addOptimisticPost(circleId, tempPostData) {
    console.log('🚀 添加乐观更新帖子:', tempPostData);
    
    // 生成临时ID
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 获取当前用户信息
    const app = getApp();
    const currentUser = app.getUserStore?.()?.userInfo;
    
    // 🔧 统一图片格式：将字符串路径转换为对象格式
    const normalizedImages = (tempPostData.tempImages || []).map((img, index) => {
      if (typeof img === 'string') {
        return { url: img, _tempUrl: img, _index: index };
      }
      return img;
    });
    
    // 创建临时帖子对象
    const optimisticPost = {
      _id: tempId,
      _tempId: tempId,
      _stableKey: tempId,  // 替换为真实帖子后保留，确保 wx:key 不变，组件不被重建
      _isUploading: true,
      _uploadProgress: 0,
      circleId: circleId,
      content: tempPostData.content || '',
      images: normalizedImages,
      imageMeta: tempPostData.imageMeta || [],
      _tempImagePaths: tempPostData.tempImages || [], // 保存临时路径用于显示
      author: currentUser ? {
        _id: currentUser._id,
        username: currentUser.username,
        name: currentUser.name,
        avatar: currentUser.avatar
      } : {},
      likes: [],
      likedUsers: [],
      comments: [],
      isLiked: false,
      createdAt: new Date().toISOString(),
      formattedTime: '刚刚',
      __optimistic: true // 标记为乐观更新的帖子
    };
    
    // 将临时帖子添加到列表顶部
    this.posts = [optimisticPost, ...this.posts];
    
    // 如果之前是空状态，更新为已加载状态
    if (this.status === POST_STATUS.EMPTY) {
      this.status = POST_STATUS.LOADED;
    }
    
    console.log('✅ 临时帖子已添加到列表');
    return tempId;
  },

  // 🚀 更新临时帖子的上传进度
  updatePostUploadProgress(tempId, progress) {
    const postIndex = this.posts.findIndex(p => p._tempId === tempId);
    if (postIndex === -1) return;
    
    const updatedPosts = [...this.posts];
    updatedPosts[postIndex] = {
      ...updatedPosts[postIndex],
      _uploadProgress: progress
    };
    
    this.posts = updatedPosts;
  },

  // 🚀 将临时帖子替换为真实帖子
  // preserveImages: true 时保留本地图片路径，避免替换后图片重加载闪烁
  replaceOptimisticPost(tempId, realPost, preserveImages = false) {
    console.log('🔄 替换临时帖子为真实帖子:', { tempId, realPostId: realPost._id });

    const postIndex = this.posts.findIndex(p => p._tempId === tempId);
    if (postIndex === -1) {
      console.warn('⚠️ 未找到临时帖子:', tempId);
      return;
    }

    // 格式化真实帖子数据
    const formattedPost = this._formatSinglePost(realPost);

    // preserveImages: 保留本地图片路径和尺寸信息，只更新非图片字段
    const tempPost = this.posts[postIndex];
    const finalPost = preserveImages
      ? { ...formattedPost, images: tempPost.images, imageMeta: tempPost.imageMeta, _stableKey: tempPost._stableKey }
      : { ...formattedPost, _stableKey: formattedPost._stableKey || formattedPost._id };

    const updatedPosts = [...this.posts];
    updatedPosts[postIndex] = finalPost;

    this.posts = updatedPosts;
    console.log('✅ 帖子替换成功');
  },

  // 🆕 Trial 发布：将真实帖子插入列表顶部（无乐观更新，发布完成后直接插入）
  prependPost(circleId, post) {
    if (this.currentCircleId !== circleId) return;
    const formatted = this._formatSinglePost(post);
    this.posts = [formatted, ...this.posts];
  },

  // 🚀 标记临时帖子上传失败
  markPostUploadFailed(tempId, errorMessage, keepMask = false) {
    console.log('❌ 标记帖子上传失败:', tempId, '保持遮罩:', keepMask);
    
    const postIndex = this.posts.findIndex(p => p._tempId === tempId);
    if (postIndex === -1) return;
    
    const updatedPosts = [...this.posts];
    updatedPosts[postIndex] = {
      ...updatedPosts[postIndex],
      _isUploading: keepMask, // 如果是违规图片，保持上传状态（不移除遮罩）
      _uploadFailed: true,
      _errorMessage: errorMessage || '上传失败'
    };
    
    this.posts = updatedPosts;
  },

  // 🚀 删除临时帖子（用于上传失败后用户主动删除）
  removeOptimisticPost(tempId) {
    console.log('🗑️ 删除临时帖子:', tempId);
    this.posts = this.posts.filter(p => p._tempId !== tempId);
    
    // 如果删除后列表为空，更新状态
    if (this.posts.length === 0) {
      this.setStatus(POST_STATUS.EMPTY);
    }
  },

  // 🚀 重试上传失败的帖子
  async retryOptimisticPost(tempId) {
    console.log('🔄 重试上传帖子:', tempId);
    
    const postIndex = this.posts.findIndex(p => p._tempId === tempId);
    if (postIndex === -1) {
      throw new Error('未找到要重试的帖子');
    }
    
    const post = this.posts[postIndex];
    
    // 重置状态
    const updatedPosts = [...this.posts];
    updatedPosts[postIndex] = {
      ...post,
      _isUploading: true,
      _uploadFailed: false,
      _uploadProgress: 0,
      _errorMessage: null
    };
    
    this.posts = updatedPosts;
    
    // 返回帖子数据供重试使用
    return {
      tempId: post._tempId,
      circleId: post.circleId,
      content: post.content,
      tempImages: post._tempImagePaths || []
    };
  },

  // 🔧 工具方法

  // 格式化帖子数据
  _formatPosts(posts) {
    // 确保输入数据去重（基于_id）
    const uniquePosts = posts.filter((post, index, arr) => 
      arr.findIndex(p => p._id === post._id) === index
    );
    return uniquePosts.map(post => this._formatSinglePost(post));
  },

  // 格式化单个帖子数据
  _formatSinglePost(post) {
    // 确保每个帖子都有稳定的 wx:key，避免组件被销毁重建
    post._stableKey = post._stableKey || post._id;
    // 格式化时间
    post.formattedTime = util.formatRelativeTime(post.createdAt);
    
    // 格式化评论时间
    if (post.comments) {
      post.comments.forEach(comment => {
        comment.formattedTime = util.formatRelativeTime(comment.createdAt);
      });
    }
    
    // 确保likedUsers数组存在（主要数据源）
    post.likedUsers = post.likedUsers || [];
    
    // 确保likes数组存在（用于兼容和显示数量）
    post.likes = post.likes || [];
    
    // 🔧 统一图片格式：确保所有图片都是对象格式
    post.images = (post.images || []).map((img, index) => {
      if (typeof img === 'string') {
        return { url: img, _index: index };
      }
      return img;
    });
    
    return post;
  },


  // 📊 计算属性 (Getters)
  
  get isEmpty() {
    return this.status === POST_STATUS.EMPTY;
  },

  get hasError() {
    return this.status === POST_STATUS.ERROR;
  },

  get isLoadingPosts() {
    return this.status === POST_STATUS.LOADING || this.isLoading;
  },

  get postsCount() {
    return this.posts.length;
  }
});

// 🎯 标记为MobX actions
Object.keys(postStore).forEach(key => {
  if (typeof postStore[key] === 'function' && !key.startsWith('get') && !key.startsWith('_')) {
    postStore[key] = action(postStore[key]);
  }
});

module.exports = {
  postStore,
  POST_STATUS
};