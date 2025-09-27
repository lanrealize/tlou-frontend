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
    currentPostTime: ''
  },

  observers: {
    'posts, currentPostIndex': function(posts, currentIndex) {
      if (posts && posts.length > 0 && currentIndex >= 0) {
        this.processHorizontalTimelineData(posts, currentIndex);
        this.updateCurrentPostTime(posts, currentIndex);
      }
    }
  },

  lifetimes: {
    attached() {
      // 组件初始化时处理数据
      const { posts, currentPostIndex } = this.properties;
      if (posts && posts.length > 0) {
        this.processHorizontalTimelineData(posts, currentPostIndex);
        this.updateCurrentPostTime(posts, currentPostIndex);
      }
    }
  },

  methods: {
    /**
     * 处理水平时间轴数据
     */
    processHorizontalTimelineData(posts, currentIndex) {
      if (!posts || posts.length === 0) return;

      // 为每个post添加时间标签，但不覆盖原始posts数据
      const processedPosts = posts.map((post, index) => {
        const postDate = new Date(post.createdAt || post.created_at || Date.now());
        return {
          ...post,
          timeLabel: this.formatTimeLabel(postDate),
          originalIndex: index
        };
      });

      // 应用筛选器，但只用于内部显示逻辑
      const filteredPosts = this.applyHorizontalTimeFilter(processedPosts, this.data.currentFilter);

      // 不要覆盖posts属性，而是存储到内部数据中
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
     * 格式化时间标签
     */
    formatTimeLabel(date) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
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
     * 时间筛选器变化
     */
    onFilterChange(e) {
      const filter = e.currentTarget.dataset.filter;
      this.setData({ currentFilter: filter });
      
      // 重新处理数据
      const { posts, currentPostIndex } = this.properties;
      this.processHorizontalTimelineData(posts, currentPostIndex);
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
