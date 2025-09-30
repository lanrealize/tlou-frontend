import { formatReadableTime, dateToTimeString } from '../../utils/timeFormatter.js';

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
    timelineNodes: [],
    timeScale: [],
    scrollTarget: '',
    currentPostTime: '',
    progressWidth: 0,
    lastProcessedLength: 0,
    lastProcessedHash: '',
    timelineTransform: 0, // 时间轴平移距离
    viewportWidth: 0 // 视窗宽度
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
        this.updateTimelineTransform(currentIndex);
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
      // 获取视窗宽度
      this.getViewportWidth();
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
     * 处理动态间距时间轴数据
     */
    processHorizontalTimelineData(posts) {
      if (!posts || posts.length === 0) return;

      // 处理posts数据，添加时间信息
      const processedPosts = posts.map((post, index) => {
        const postDate = new Date(post.createdAt || post.created_at || Date.now());
        return {
          ...post,
          timeLabel: this.formatTimeLabel(postDate),
          timestamp: postDate.getTime(),
          originalIndex: index
        };
      });

      // 按时间排序
      processedPosts.sort((a, b) => a.timestamp - b.timestamp);

      // 计算时间轴节点
      const timelineNodes = this.calculateTimelineNodes(processedPosts);
      
      // 暂时禁用时间刻度，因为使用固定间距
      const timeScale = [];

      // 应用筛选器
      const filteredPosts = this.data.currentFilter === 'all' 
        ? processedPosts 
        : this.applyHorizontalTimeFilter(processedPosts, this.data.currentFilter);

      // 批量更新
      this.setData({
        processedPosts: processedPosts,
        filteredPosts: filteredPosts,
        timelineNodes: timelineNodes,
        timeScale: timeScale
      });
    },

    /**
     * 使用自定义间距算法计算时间轴节点位置
     */
    calculateTimelineNodes(posts) {
      if (!posts || posts.length === 0) return [];

      // 生成时间戳数组用于计算间距
      const timestamps = posts.map(post => {
        const date = new Date(post.timestamp);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        return `${year}/${month}/${day}/${hour}/${minute}`;
      });

      // 使用自定义间距计算函数
      const spacings = this.calculateTimeAxisSpacing(timestamps);
      
      // 计算每个节点的累积位置
      const nodes = [];
      let cumulativePosition = 0;

      posts.forEach((post, index) => {
        // 计算与前一个节点的时间间隔
        let intervalLabel = '';
        if (index > 0) {
          const prevPost = posts[index - 1];
          const intervalMs = post.timestamp - prevPost.timestamp;
          intervalLabel = this.formatTimeInterval(intervalMs);
        }

        nodes.push({
          ...post,
          position: cumulativePosition, // 使用累积位置（vw单位）
          intervalLabel: intervalLabel,
          hasImages: post.images && post.images.length > 0
        });

        // 为下一个节点累加间距
        if (index < spacings.length) {
          cumulativePosition += parseFloat(spacings[index]);
        }
      });

      return nodes;
    },

    /**
     * 自定义时间轴间距计算函数
     */
    calculateTimeAxisSpacing(timestamps) {
      const parseDate = (timestamp) => {
        const [year, month, day, hour, minute] = timestamp.split('/').map(Number);
        return new Date(year, month - 1, day, hour, minute);
      };

      const dates = timestamps.map(parseDate);
      const spacings = [];

      for (let i = 0; i < dates.length - 1; i++) {
        const diffMs = dates[i + 1].getTime() - dates[i].getTime();
        const diffMinutes = diffMs / (1000 * 60);

        let vw;
        if (diffMinutes < 5) vw = 7.5;
        else if (diffMinutes < 15) vw = 10;
        else if (diffMinutes < 30) vw = 12.5;
        else if (diffMinutes < 60) vw = 15;
        else if (diffMinutes < 120) vw = 17.5;
        else if (diffMinutes < 240) vw = 20;
        else if (diffMinutes < 480) vw = 22.5;
        else if (diffMinutes < 1440) vw = 25;
        else if (diffMinutes < 4320) vw = 27.5;
        else vw = 30;

        spacings.push(`${vw}`);
      }

      return spacings;
    },

    /**
     * 格式化时间间隔
     */
    formatTimeInterval(milliseconds) {
      const minutes = Math.floor(milliseconds / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days}天`;
      } else if (hours > 0) {
        return `${hours}小时`;
      } else if (minutes > 0) {
        return `${minutes}分钟`;
      } else {
        return '刚刚';
      }
    },

    /**
     * 生成时间刻度
     */
    generateTimeScale(posts) {
      if (!posts || posts.length < 2) return [];

      const startTime = posts[0].timestamp;
      const endTime = posts[posts.length - 1].timestamp;
      const totalDuration = endTime - startTime;
      
      const scales = [];
      
      // 根据时间跨度决定刻度间隔
      let interval, format;
      if (totalDuration <= 4 * 60 * 60 * 1000) { // 4小时内，每小时一个刻度
        interval = 60 * 60 * 1000; // 1小时
        format = (time) => {
          const date = new Date(time);
          return `${date.getHours()}:00`;
        };
      } else if (totalDuration <= 24 * 60 * 60 * 1000) { // 1天内，每4小时一个刻度
        interval = 4 * 60 * 60 * 1000; // 4小时
        format = (time) => {
          const date = new Date(time);
          return `${date.getHours()}:00`;
        };
      } else { // 超过1天，每天一个刻度
        interval = 24 * 60 * 60 * 1000; // 1天
        format = (time) => {
          const date = new Date(time);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        };
      }

      // 生成刻度点
      let currentTime = Math.ceil(startTime / interval) * interval;
      while (currentTime <= endTime) {
        const position = ((currentTime - startTime) / totalDuration) * 100;
        scales.push({
          time: currentTime,
          position: Math.max(0, Math.min(100, position)),
          label: format(currentTime)
        });
        currentTime += interval;
      }

      return scales;
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
     * 格式化时间标签 - 使用新的formatReadableTime函数
     */
    formatTimeLabel(date) {
      try {
        // 将Date对象转换为YYYY/MM/DD/HH/mm格式
        const timeString = dateToTimeString(date);
        // 使用formatReadableTime函数格式化
        return formatReadableTime(timeString);
      } catch (error) {
        console.error('时间格式化错误:', error);
        // 降级到简单格式
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
      }
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
     * 获取视窗宽度
     */
    getViewportWidth() {
      const query = this.createSelectorQuery();
      query.select('.timeline-viewport').boundingClientRect((rect) => {
        if (rect) {
          this.setData({ viewportWidth: rect.width });
        }
      }).exec();
    },

    /**
     * 更新时间轴transform，让active节点居中显示
     */
    updateTimelineTransform(currentIndex) {
      const { timelineNodes, viewportWidth } = this.data;
      if (!timelineNodes || timelineNodes.length === 0 || !viewportWidth) {
        return;
      }

      // 找到当前active节点
      const activeNode = timelineNodes.find(node => node.originalIndex === currentIndex);
      if (!activeNode) return;

      // 计算节点在时间轴上的实际位置（px）
      // vw转换为px：1vw = viewportWidth / 100
      const nodePositionPx = (activeNode.position * viewportWidth) / 100;
      
      // 计算需要的transform值，让节点居中显示
      const centerOffset = viewportWidth / 2;
      const transform = centerOffset - nodePositionPx;
      
      // 限制transform范围，防止过度滚动
      const maxTransform = 0; // 不能向右滚动超过起始位置
      const minTransform = viewportWidth - (200 * viewportWidth / 100); // 200vw是容器宽度
      
      const finalTransform = Math.max(minTransform, Math.min(maxTransform, transform));
      
      this.setData({ timelineTransform: finalTransform });
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
      const { timelineNodes } = this.data;
      
      if (!timelineNodes || !timelineNodes[index]) return;
      
      // 获取原始索引
      const originalIndex = timelineNodes[index].originalIndex;
      
      // 立即更新transform，让点击的节点居中
      this.updateTimelineTransform(originalIndex);
      
      // 触发事件，通知父组件切换到指定post
      this.triggerEvent('timelinePostTap', {
        targetIndex: originalIndex
      });

      // 添加点击反馈
      wx.vibrateShort({
        type: 'light'
      });
    },

  }
});
