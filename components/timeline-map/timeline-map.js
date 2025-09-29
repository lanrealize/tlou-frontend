Component({
  properties: {
    posts: {
      type: Array,
      value: []
    },
    currentPostIndex: {
      type: Number,
      value: 0
    }
  },

  data: {
    expanded: false,
    currentFilter: 'all',
    processedPosts: [],
    filteredPosts: [],
    scrollTarget: '',
    currentPostTime: '',
    progressWidth: 0,
    lastProcessedLength: 0,
    lastProcessedHash: ''
  },

  observers: {
    'posts': function(posts) {
      // 只有当posts数组真正改变时才重新处理
      if (posts && posts.length > 0) {
        const currentHash = this.getPostsHash(posts);
        if (currentHash !== this.data.lastProcessedHash) {
          this.processHorizontalTimelineData(posts);
          this.setData({ lastProcessedHash: currentHash });
        }
      }
    },
    'currentPostIndex': function(currentIndex) {
      // 只更新时间显示和进度，不重新处理整个数组
      if (currentIndex >= 0) {
        this.updateCurrentPostTime(this.properties.posts, currentIndex);
        this.updateProgressWidth(currentIndex);
      }
    }
  },

  lifetimes: {
    attached() {
      // 组件初始化时处理数据
      const { posts, currentPostIndex } = this.properties;
      if (posts && posts.length > 0) {
        this.processHorizontalTimelineData(posts);
        this.updateCurrentPostTime(posts, currentPostIndex);
        this.updateProgressWidth(currentPostIndex);
      }
    }
  },

  methods: {
    /**
     * 生成posts数组的哈希值，用于检测变化
     */
    getPostsHash(posts) {
      if (!posts || posts.length === 0) return '';
      return `${posts.length}-${posts[0]._id || posts[0].id || ''}-${posts[posts.length - 1]._id || posts[posts.length - 1].id || ''}`;
    },

    /**
     * 处理水平时间轴数据 - 性能优化版本
     */
    processHorizontalTimelineData(posts) {
      if (!posts || posts.length === 0) return;

      // 使用缓存避免重复计算
      const processedPosts = posts.map((post, index) => {
        // 如果已经有timeLabel就不重新计算
        if (post.timeLabel) {
          return { ...post, originalIndex: index };
        }
        
        const postDate = new Date(post.createdAt || post.created_at || Date.now());
        return {
          ...post,
          timeLabel: this.formatTimeLabel(postDate),
          originalIndex: index
        };
      });

      // 只在需要时应用筛选器
      const filteredPosts = this.data.currentFilter === 'all' 
        ? processedPosts 
        : this.applyHorizontalTimeFilter(processedPosts, this.data.currentFilter);

      // 批量更新，减少setData调用
      this.setData({
        processedPosts: processedPosts,
        filteredPosts: filteredPosts
      });
    },

    /**
     * 应用水平时间轴筛选器
     */
    applyHorizontalTimeFilter(posts, filter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      switch (filter) {
        case 'today':
          return posts.filter(post => {
            const postDate = new Date(post.createdAt || post.created_at || Date.now());
            const postDay = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
            return postDay.getTime() === today.getTime();
          });
        case 'all':
        default:
          return posts;
      }
    },


    /**
     * 获取日期标签
     */
    getDateLabel(date, now) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const postDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (postDate.getTime() === today.getTime()) {
        return '今天';
      } else if (postDate.getTime() === yesterday.getTime()) {
        return '昨天';
      } else {
        const diffDays = Math.floor((today.getTime() - postDate.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays <= 7) {
          return `${diffDays}天前`;
        } else {
          return `${date.getMonth() + 1}月${date.getDate()}日`;
        }
      }
    },

    /**
     * 格式化时间标签 - 带缓存优化
     */
    formatTimeLabel(date) {
      // 简单的时间格式化，避免复杂计算
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
    },


    /**
     * 更新当前post时间显示
     */
    updateCurrentPostTime(posts, currentIndex) {
      if (!posts || posts.length === 0 || currentIndex < 0 || currentIndex >= posts.length) {
        this.setData({ currentPostTime: '' });
        return;
      }

      const currentPost = posts[currentIndex];
      const postDate = new Date(currentPost.createdAt || currentPost.created_at || Date.now());
      const now = new Date();
      
      const timeLabel = this.formatTimeLabel(postDate);
      const dateLabel = this.getDateLabel(postDate, now);
      
      this.setData({
        currentPostTime: `${dateLabel} ${timeLabel}`
      });
    },

    /**
     * 更新进度宽度
     */
    updateProgressWidth(currentIndex) {
      const { posts } = this.properties;
      if (!posts || posts.length <= 1) {
        this.setData({ progressWidth: 100 });
        return;
      }
      
      const width = Math.round((currentIndex / (posts.length - 1)) * 100);
      this.setData({ progressWidth: width });
    },

    /**
     * 时间筛选器变化 - 性能优化版本
     */
    onFilterChange(e) {
      const filter = e.currentTarget.dataset.filter;
      const oldFilter = this.data.currentFilter;
      
      // 如果筛选器没有变化，直接返回
      if (filter === oldFilter) return;
      
      this.setData({ currentFilter: filter });
      
      // 只重新应用筛选器，不重新处理整个数据
      const { processedPosts } = this.data;
      if (processedPosts && processedPosts.length > 0) {
        const filteredPosts = filter === 'all' 
          ? processedPosts 
          : this.applyHorizontalTimeFilter(processedPosts, filter);
        
        this.setData({ filteredPosts });
      }
    },

    /**
     * 点击时间轴上的post
     */
    onTimelinePostTap(e) {
      const index = e.currentTarget.dataset.index;
      
      // 触发事件，通知父组件切换到指定post
      this.triggerEvent('timelinePostTap', {
        targetIndex: index
      });

      // 添加点击反馈
      wx.vibrateShort({
        type: 'light'
      });
    },

  }
});
