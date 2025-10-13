const { observable, action } = require('mobx-miniprogram');
const api = require('../utils/api');
const util = require('../utils/util');

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
  async loadPosts(circleId, loadMore = false) {
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
      const response = await api.posts.getList(circleId, {
        page: currentPage,
        limit: this.pageSize
      });

      const newPosts = response.data.posts || [];
      
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
  async refreshPosts(circleId) {

    this.page = 1;
    this.hasMore = true;
    await this.loadPosts(circleId, false);
  },

  // 加载更多帖子
  async loadMorePosts() {
    if (this.currentCircleId && this.hasMore && !this.isLoading) {
  
      await this.loadPosts(this.currentCircleId, true);
    }
  },

  // 点赞/取消点赞
  async toggleLike(postId, userInfo) {
    const postIndex = this.posts.findIndex(p => p._id === postId);
    if (postIndex === -1) {

      return;
    }

    if (!userInfo || (!userInfo.openid && !userInfo._id)) {

      return;
    }

    try {
  
      
      const response = await api.posts.like(postId);
      const { liked } = response.data;
      


      // 更新本地状态
      const updatedPosts = [...this.posts];
      const post = updatedPosts[postIndex];
      
      // 确保likes数组存在
      post.likes = post.likes || [];
      
      // 确保likedUsers数组存在
      post.likedUsers = post.likedUsers || [];
      
      // 统一使用 _id 作为用户标识符
      const userIdentifier = userInfo._id;
      
      if (!userIdentifier) {
  
        throw new Error('用户信息不完整');
      }
      

      
      if (liked) {
        // 添加点赞：确保不重复添加
        const normalizedUserId = userIdentifier.toString();
        if (!post.likes.some(id => id.toString() === normalizedUserId)) {
          post.likes.push(userIdentifier);
          
          // 同时更新likedUsers数组
          if (!post.likedUsers.some(user => user._id.toString() === normalizedUserId)) {
            post.likedUsers.push({
              _id: userInfo._id,
              username: userInfo.username,
              avatar: userInfo.avatar
            });
          }
        }
      } else {
        // 移除点赞：精确匹配用户ID
        const normalizedUserId = userIdentifier.toString();
        post.likes = post.likes.filter(id => id.toString() !== normalizedUserId);
        
        // 同时从likedUsers数组移除
        post.likedUsers = post.likedUsers.filter(user => user._id.toString() !== normalizedUserId);
      }
      
      // 重新计算点赞状态
      post.isLiked = this._checkIfUserLiked(post.likes);
      
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
            if (commentData.replyToUserId) {
              // 从当前评论中查找回复目标用户
              const targetPost = this.posts[postIndex];
              const targetComment = targetPost.comments?.find(c => 
                c.author._id === commentData.replyToUserId
              );
              if (targetComment) {
                replyToUser = {
                  _id: targetComment.author._id,
                  username: targetComment.author.username || targetComment.author.name,
                  name: targetComment.author.name || targetComment.author.username,
                  openid: targetComment.author.openid
                };
              } else {
                replyToUser = {
                  _id: commentData.replyToUserId,
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
                openid: currentUser.openid,
                avatar: currentUser.avatar
              },
              content: commentData.content,
              replyTo: replyToUser,
              createdAt: new Date().toISOString(),
              formattedTime: util.formatRelativeTime(new Date())
            };
            

            
            // 更新本地帖子数据
            const updatedPosts = [...this.posts];
            const post = updatedPosts[postIndex];
            post.comments = post.comments || [];
            post.comments.push(newComment);
            
            this.posts = updatedPosts;
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
    console.log('🔧 格式化帖子数据:', {
      postId: post._id,
      originalLikes: post.likes,
      originalComments: post.comments?.length || 0,
      hasLikedUsers: !!post.likedUsers
    });
    
    // 格式化时间
    post.formattedTime = util.formatRelativeTime(post.createdAt);
    
    // 格式化评论时间
    if (post.comments) {
      post.comments.forEach(comment => {
        comment.formattedTime = util.formatRelativeTime(comment.createdAt);
      });
    }
    
    // 确保likes数组存在
    post.likes = post.likes || [];
    
    // 确保likedUsers数组存在
    post.likedUsers = post.likedUsers || [];
    
    // 确保images数组存在 - 保持原始数据格式，让组件层面处理兼容性
    post.images = post.images || [];
    
    // 正确设置点赞状态
    post.isLiked = this._checkIfUserLiked(post.likes);
    
    console.log('✅ 帖子格式化完成:', {
      postId: post._id,
      isLiked: post.isLiked,
      likesCount: post.likes.length,
      likedUsersCount: post.likedUsers.length,
      commentsCount: post.comments?.length || 0
    });
    
    return post;
  },

  // 检查当前用户是否点赞了该帖子
  _checkIfUserLiked(likes) {
    try {
      const app = getApp();
      const currentUser = app.getUserStore?.()?.userInfo;
      if (!currentUser) {
        return false;
      }
      
      // 统一使用 _id 作为用户标识符，提高一致性
      const userId = currentUser._id;
      
      console.log('🔍 检查点赞状态:', {
        userId,
        likes,
        likesLength: likes ? likes.length : 0
      });
      
      if (!likes || likes.length === 0) {
        return false;
      }
      
      // 优先使用 _id 进行比较，确保一致性
      const isLiked = likes.some(likeId => {
        const normalizedLikeId = likeId.toString();
        const normalizedUserId = userId ? userId.toString() : '';
        return normalizedLikeId === normalizedUserId;
      });
      
      console.log('✅ 点赞状态结果:', isLiked);
      return isLiked;
    } catch (error) {
      console.warn('⚠️ 获取用户信息失败，无法判断点赞状态:', error);
      return false;
    }
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