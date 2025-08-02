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
    console.log(`🔄 帖子状态变更: ${this.status} → ${status}`, data);
    
    this.status = status;
    this.isLoading = false;
    
    switch (status) {
      case POST_STATUS.LOADED:
        this.posts = data.posts || [];
        this.hasMore = data.hasMore !== undefined ? data.hasMore : true;
        this.page = data.page || 1;
        this.errorMessage = '';
        console.log('✅ 帖子加载成功:', this.posts.length);
        break;
        
      case POST_STATUS.ERROR:
        this.errorMessage = data.message || '加载帖子失败';
        console.error('❌ 帖子错误状态:', this.errorMessage);
        break;
        
      case POST_STATUS.EMPTY:
        this.posts = [];
        this.hasMore = false;
        this.errorMessage = '';
        console.log('📭 帖子列表为空');
        break;
        
      case POST_STATUS.LOADING:
        this.isLoading = true;
        console.log('🔄 正在加载帖子...');
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
      console.log('🔄 切换朋友圈:', circleId);
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
      console.log('⚠️ 正在加载中，跳过重复请求');
      return;
    }

    // 如果是新的朋友圈，重置数据
    if (circleId !== this.currentCircleId) {
      this.setCurrentCircle(circleId);
    }

    // 如果是加载更多但没有更多数据，直接返回
    if (loadMore && !this.hasMore) {
      console.log('⚠️ 没有更多帖子了');
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
        // 加载更多：合并到现有列表
        allPosts = [...this.posts, ...formattedPosts];
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
      console.error('❌ 加载帖子失败:', error);
      this.setStatus(POST_STATUS.ERROR, { 
        message: error.message || '网络异常，请重试' 
      });
    }
  },

  // 刷新帖子列表
  async refreshPosts(circleId) {
    console.log('🔄 刷新帖子列表');
    this.page = 1;
    this.hasMore = true;
    await this.loadPosts(circleId, false);
  },

  // 加载更多帖子
  async loadMorePosts() {
    if (this.currentCircleId && this.hasMore && !this.isLoading) {
      console.log('📄 加载更多帖子, 当前页:', this.page);
      await this.loadPosts(this.currentCircleId, true);
    }
  },

  // 点赞/取消点赞
  async toggleLike(postId, userInfo) {
    const postIndex = this.posts.findIndex(p => p._id === postId);
    if (postIndex === -1) {
      console.error('❌ 找不到指定帖子:', postId);
      return;
    }

    if (!userInfo || (!userInfo.openid && !userInfo._id)) {
      console.error('❌ 用户信息不完整，无法进行点赞操作', userInfo);
      return;
    }

    try {
      console.log('🚀 开始点赞操作:', { postId, userInfo });
      
      const response = await api.posts.like(postId);
      const { liked } = response.data;
      
      console.log('📤 点赞API响应:', response);

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
        console.error('❌ 用户标识符缺失，无法进行点赞操作');
        throw new Error('用户信息不完整');
      }
      
      console.log('🔍 点赞前状态:', {
        liked,
        userIdentifier,
        currentLikes: post.likes,
        likesCount: post.likes.length
      });
      
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
      
      console.log('✅ 点赞操作完成:', {
        action: liked ? '点赞' : '取消点赞',
        isLiked: post.isLiked,
        likesCount: post.likes.length,
        likes: post.likes
      });
      
      return { success: true, liked };
    } catch (error) {
      console.error('❌ 点赞操作失败:', error);
      throw error;
    }
  },

  // 添加评论
  async addComment(postId, commentData) {
    // 防重复提交检查
    const commentKey = `${postId}_${Date.now()}`;
    if (this._pendingComments && this._pendingComments.has(commentKey)) {
      console.warn('⚠️ 评论正在提交中，请勿重复操作');
      return;
    }

    // 初始化待处理评论集合
    if (!this._pendingComments) {
      this._pendingComments = new Set();
    }
    
    this._pendingComments.add(commentKey);

    try {
      console.log('🚀 开始添加评论:', { postId, commentData });
      
      const response = await api.posts.addComment(postId, commentData);
      console.log('📤 API响应:', response);
      
      // 本地更新：构建新评论并添加到对应帖子中
      const postIndex = this.posts.findIndex(p => p._id === postId);
      console.log('🔍 查找帖子索引:', { postIndex, postId, postsCount: this.posts.length });
      
      if (postIndex !== -1) {
        try {
          // 获取当前用户信息
          const app = getApp();
          const currentUser = app.getUserStore?.()?.userInfo;
          console.log('👤 当前用户信息:', currentUser);
          
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
            
            console.log('📝 构建的新评论:', newComment);
            
            // 更新本地帖子数据
            const updatedPosts = [...this.posts];
            const post = updatedPosts[postIndex];
            post.comments = post.comments || [];
            post.comments.push(newComment);
            
            this.posts = updatedPosts;
            console.log('✅ 评论添加成功，本地数据已更新. 当前评论数:', post.comments.length);
          } else {
            console.warn('⚠️ 无法获取用户信息，回退到重新加载');
            throw new Error('用户信息不完整');
          }
        } catch (localUpdateError) {
          console.warn('⚠️ 本地更新失败，回退到重新加载所有帖子:', localUpdateError);
          // 如果本地更新失败，回退到重新加载
          if (this.currentCircleId) {
            await this.refreshPosts(this.currentCircleId);
          }
        }
      } else {
        console.warn('⚠️ 未找到对应帖子，回退到重新加载');
        if (this.currentCircleId) {
          await this.refreshPosts(this.currentCircleId);
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ 添加评论失败:', error);
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
        console.log('✅ 评论删除成功，本地数据已更新');
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
    return posts.map(post => this._formatSinglePost(post));
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
    
    // 确保images数组存在并标准化格式
    post.images = post.images || [];
    
    // 兼容新旧图片数据格式：确保images数组包含URL用于显示
    post.images = post.images.map(img => {
      if (typeof img === 'string') {
        // 旧格式：直接是URL字符串
        return img;
      } else if (typeof img === 'object' && img.url) {
        // 新格式：包含完整信息的对象，提取URL用于显示
        return img.url;
      }
      return img; // 兜底处理
    });
    
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