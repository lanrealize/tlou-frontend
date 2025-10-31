const { observable, action } = require('mobx-miniprogram');
const api = require('../utils/api');
const util = require('../utils/util');

// 🎯 朋友圈状态常量定义
const CIRCLE_STATUS = {
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  EMPTY: 'empty'
};

// 朋友圈状态管理Store
const circleStore = observable({
  // 🔥 核心状态数据
  status: CIRCLE_STATUS.EMPTY,
  
  // 最近活动的朋友圈（用于首页卡片显示）
  recentCircle: null,
  
  // 所有朋友圈列表（备用，暂时可能不需要）
  circles: [],
  
  // 加载状态
  isLoading: false,
  errorMessage: '',
  
  // 🎬 动画控制
  isUpdating: false,              // 朋友圈卡片是否正在更新（用于控制切换动画）
  isEmptyCardUpdating: false,     // 空状态卡片是否正在更新（用于控制切换动画）
  
  // 🔧 缓存机制
  lastUpdateTime: 0,          // 上次更新时间
  cacheTimeout: 300000,       // 缓存超时时间（5分钟）
  currentUserId: null,        // 当前用户ID（用于检测身份变化）
  
  // 🎯 Loading 延迟策略
  _loadingTimer: null,
  _loadingInnerTimer: null,  // 内部嵌套定时器

  // 🎯 统一状态更新接口
  setStatus(status, data = {}) {
    this.status = status;
    
    // 清理所有定时器
    if (this._loadingTimer) {
      clearTimeout(this._loadingTimer);
      this._loadingTimer = null;
    }
    if (this._loadingInnerTimer) {
      clearTimeout(this._loadingInnerTimer);
      this._loadingInnerTimer = null;
    }
    
    switch (status) {
      case CIRCLE_STATUS.LOADED:
        this.isLoading = false;
        this.errorMessage = '';
        break;
        
      case CIRCLE_STATUS.ERROR:
        this.isLoading = false;
        this.errorMessage = data.message || '加载朋友圈失败';
        break;
        
      case CIRCLE_STATUS.EMPTY:
        this.isLoading = false;
        this.recentCircle = null;
        this.circles = [];
        this.errorMessage = '';
        break;
        
      case CIRCLE_STATUS.LOADING:
        // 延迟 1 秒后才显示 loading（避免快速请求的闪烁）
        this._loadingTimer = setTimeout(() => {
          action(() => {
            this.isLoading = true;
          })();
        }, 1000);
        break;
    }
  },

  // 📋 核心业务方法

  /**
   * 生成朋友圈数据的哈希值（用于快速比较）
   * 只包含真正影响显示的后端数据，不包含前端计算的值
   */
  _generateCircleHash(circle) {
    if (!circle) return '';
    
    // 🔧 关键字段说明：
    // - _id: 朋友圈ID
    // - memberCount: 成员数量
    // - latestPost?.createdAt: 最新帖子时间（用户发新帖会变）
    // - createdAt: 朋友圈创建时间（兜底）
    // - members: 成员列表（加入/退出会变）
    const latestActivityTime = circle.latestPost 
      ? circle.latestPost.createdAt 
      : circle.createdAt;
    
    const keyFields = [
      circle._id,
      circle.memberCount,
      latestActivityTime,  // 使用原始时间戳，不是格式化后的相对时间
      (circle.members || []).map(m => m._id).sort().join(',')
    ];
    
    return keyFields.join('|');
  },

  /**
   * 比较两个朋友圈是否相同
   */
  _isCircleChanged(newCircle, oldCircle) {
    if (!newCircle && !oldCircle) return false;
    if (!newCircle || !oldCircle) return true;
    
    const newHash = this._generateCircleHash(newCircle);
    const oldHash = this._generateCircleHash(oldCircle);
    
    return newHash !== oldHash;
  },

  /**
   * 格式化朋友圈数据
   */
  _formatCircle(circle) {
    if (!circle) return null;
    
    // 🔧 "最近更新于"应该是最新帖子的时间，如果没有帖子则用朋友圈创建时间
    const lastActivityTime = circle.latestPost 
      ? circle.latestPost.createdAt 
      : circle.createdAt;
    
    return {
      ...circle,
      formattedTime: util.formatRelativeTime(lastActivityTime),
      memberCount: circle.members ? circle.members.length : 0
    };
  },

  /**
   * 设置最近朋友圈（带动画）
   * @param {Object} newCircle - 新的朋友圈数据
   * @param {Boolean} withAnimation - 是否使用动画
   */
  async setRecentCircle(newCircle, withAnimation = false) {
    const formattedCircle = this._formatCircle(newCircle);
    
    // 检查数据是否真的变化了
    const hasChanged = this._isCircleChanged(formattedCircle, this.recentCircle);
    
    if (!hasChanged) {
      return false;
    }
    
    // 🎯 检测卡片类型变化（有圈 ↔ 无圈）
    const oldHasCircle = this.recentCircle !== null;
    const newHasCircle = formattedCircle !== null;
    const isCardTypeChanged = oldHasCircle !== newHasCircle;
    
    if (withAnimation) {
      if (isCardTypeChanged) {
        // 🎬 跨卡片类型切换动画
        
        if (oldHasCircle && !newHasCircle) {
          // 从有圈变无圈：朋友圈卡片淡出 → 空状态卡片淡入
          action(() => {
            this.isUpdating = true;  // 淡出朋友圈卡片
          })();
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // 更新数据，同时让新的空状态卡片以updating状态出现
          action(() => {
            this.recentCircle = formattedCircle;
            this.isUpdating = false;
            this.isEmptyCardUpdating = true;  // 新卡片以淡出状态出现
          })();
          
          // 短暂延迟后触发淡入
          await new Promise(resolve => setTimeout(resolve, 50));
          action(() => {
            this.isEmptyCardUpdating = false;  // 触发空状态卡片淡入
          })();
          
        } else if (!oldHasCircle && newHasCircle) {
          // 从无圈变有圈：空状态卡片淡出 → 朋友圈卡片淡入
          action(() => {
            this.isEmptyCardUpdating = true;  // 淡出空状态卡片
          })();
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // 更新数据，同时让新的朋友圈卡片以updating状态出现
          action(() => {
            this.recentCircle = formattedCircle;
            this.isEmptyCardUpdating = false;
            this.isUpdating = true;  // 新卡片以淡出状态出现
          })();
          
          // 短暂延迟后触发淡入
          await new Promise(resolve => setTimeout(resolve, 50));
          action(() => {
            this.isUpdating = false;  // 触发朋友圈卡片淡入
          })();
        }
        
      } else if (oldHasCircle && newHasCircle) {
        // 🎬 同类型卡片内容变化动画（原有逻辑）
        
        // 先标记正在更新，触发淡出
        action(() => {
          this.isUpdating = true;
        })();
        
        // 等待淡出动画完成（250ms transform + 50ms buffer = 300ms）
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 更新数据
        action(() => {
          this.recentCircle = formattedCircle;
        })();
        
        // 短暂延迟后结束更新状态，触发淡入
        await new Promise(resolve => setTimeout(resolve, 50));
        action(() => {
          this.isUpdating = false;
        })();
      } else {
        // 其他情况：直接更新
        action(() => {
          this.recentCircle = formattedCircle;
          this.isUpdating = false;
          this.isEmptyCardUpdating = false;
        })();
      }
    } else {
      // 无动画：直接更新（使用 action 包裹）
      action(() => {
        this.recentCircle = formattedCircle;
        this.isUpdating = false;
        this.isEmptyCardUpdating = false;
      })();
    }
    
    // 更新时间戳（使用 action 包裹）
    action(() => {
      this.lastUpdateTime = Date.now();
    })();
    
    return true;
  },

  /**
   * 统一的智能刷新方法
   * 每次进入main页面调用，自动判断是否需要刷新，并用动画优雅切换
   */
  async loadRecentCircle() {
    const app = getApp();
    const userStore = app.getUserStore();
    const currentUserId = userStore?.userInfo?._id;
    
    // 🎯 特殊情况1：首次加载（store为空），直接显示loading
    const isFirstLoad = !this.recentCircle && !this.lastUpdateTime;
    if (isFirstLoad) {
      this.setStatus(CIRCLE_STATUS.LOADING);
      
      try {
        const res = await api.circles.getMyParticipated();
        const circles = res.data.circles || [];
        this.circles = circles;
        
        const sortedCircles = [...circles].sort((a, b) => {
          const timeA = a.latestPost?.createdAt || a.createdAt || 0;
          const timeB = b.latestPost?.createdAt || b.createdAt || 0;
          return new Date(timeB) - new Date(timeA);
        });
        
        const newRecentCircle = sortedCircles.length > 0 ? sortedCircles[0] : null;
        
        // 首次加载完成后，用动画切换到目标卡片
        await this.setRecentCircle(newRecentCircle, true);
        
        if (newRecentCircle) {
          this.setStatus(CIRCLE_STATUS.LOADED);
        } else {
          this.setStatus(CIRCLE_STATUS.EMPTY);
        }
        
        this.currentUserId = currentUserId;
        return { success: true, updated: true };
        
      } catch (error) {
        console.error('❌ [circleStore] 首次加载失败:', error);
        this.setStatus(CIRCLE_STATUS.ERROR, { message: error.message });
        return { success: false, error };
      }
    }
    
    // 🎯 检查是否需要刷新
    const userChanged = this.currentUserId && currentUserId !== this.currentUserId;
    this.currentUserId = currentUserId;
    
    // 如果身份没变，先请求数据检查是否有变化
    if (!userChanged) {
      try {
        const res = await api.circles.getMyParticipated();
        const circles = res.data.circles || [];
        const sortedCircles = [...circles].sort((a, b) => {
          const timeA = a.latestPost?.createdAt || a.createdAt || 0;
          const timeB = b.latestPost?.createdAt || b.createdAt || 0;
          return new Date(timeB) - new Date(timeA);
        });
        
        const newRecentCircle = sortedCircles.length > 0 ? sortedCircles[0] : null;
        
        // 检查是否有变化
        const hasChanged = this._isCircleChanged(newRecentCircle, this.recentCircle);
        
        if (!hasChanged) {
          // 🎯 数据没变化，不刷新UI
          return { success: true, updated: false };
        }
        
        // 🎯 数据有变化，直接用动画切换（数据已经在手里了）
        await this.setRecentCircle(newRecentCircle, true);
        
        if (newRecentCircle) {
          this.setStatus(CIRCLE_STATUS.LOADED);
        } else {
          this.setStatus(CIRCLE_STATUS.EMPTY);
        }
        
        this.circles = circles;
        return { success: true, updated: true };
        
      } catch (error) {
        console.error('❌ [circleStore] 加载失败:', error);
        this.setStatus(CIRCLE_STATUS.ERROR, { message: error.message });
        return { success: false, error };
      }
    }
    
    // 🎯 身份变化了，需要刷新（可能加载时间长，启用loading保护）
    
    // 启动1秒loading定时器
    this._loadingTimer = setTimeout(() => {
      action(() => {
        // 1秒后数据还没回来，显示loading（用动画切换）
        this.isUpdating = true;  // 触发当前卡片淡出
      })();
      
      // 等待当前卡片淡出（300ms）
      this._loadingInnerTimer = setTimeout(() => {
        action(() => {
          this.setStatus(CIRCLE_STATUS.LOADING);
          this.isUpdating = false;
        })();
      }, 300);
    }, 1000);
    
    try {
      const res = await api.circles.getMyParticipated();
      const circles = res.data.circles || [];
      
      // 清理所有定时器
      if (this._loadingTimer) {
        clearTimeout(this._loadingTimer);
        this._loadingTimer = null;
      }
      if (this._loadingInnerTimer) {
        clearTimeout(this._loadingInnerTimer);
        this._loadingInnerTimer = null;
      }
      
      this.circles = circles;
      
      const sortedCircles = [...circles].sort((a, b) => {
        const timeA = a.latestPost?.createdAt || a.createdAt || 0;
        const timeB = b.latestPost?.createdAt || b.createdAt || 0;
        return new Date(timeB) - new Date(timeA);
      });
      
      const newRecentCircle = sortedCircles.length > 0 ? sortedCircles[0] : null;
      
      // 用动画切换到目标卡片
      await this.setRecentCircle(newRecentCircle, true);
      
      if (newRecentCircle) {
        this.setStatus(CIRCLE_STATUS.LOADED);
      } else {
        this.setStatus(CIRCLE_STATUS.EMPTY);
      }
      
      return { success: true, updated: true };
      
    } catch (error) {
      console.error('❌ [circleStore] 加载失败:', error);
      
      // 清理所有定时器
      if (this._loadingTimer) {
        clearTimeout(this._loadingTimer);
        this._loadingTimer = null;
      }
      if (this._loadingInnerTimer) {
        clearTimeout(this._loadingInnerTimer);
        this._loadingInnerTimer = null;
      }
      
      this.setStatus(CIRCLE_STATUS.ERROR, { message: error.message });
      return { success: false, error };
    }
  },

  /**
   * 重置状态
   */
  reset() {
    // 清理所有定时器
    if (this._loadingTimer) {
      clearTimeout(this._loadingTimer);
      this._loadingTimer = null;
    }
    if (this._loadingInnerTimer) {
      clearTimeout(this._loadingInnerTimer);
      this._loadingInnerTimer = null;
    }
    
    this.status = CIRCLE_STATUS.EMPTY;
    this.recentCircle = null;
    this.circles = [];
    this.isLoading = false;
    this.isUpdating = false;
    this.isEmptyCardUpdating = false;
    this.errorMessage = '';
    this.lastUpdateTime = 0;
    this.currentUserId = null;
  },

  // 📊 计算属性 (Getters)
  
  get isEmpty() {
    return this.status === CIRCLE_STATUS.EMPTY;
  },

  get hasError() {
    return this.status === CIRCLE_STATUS.ERROR;
  },

  get hasRecentCircle() {
    return this.recentCircle !== null;
  },

  get isCacheValid() {
    if (!this.recentCircle) return false;
    return (Date.now() - this.lastUpdateTime) < this.cacheTimeout;
  }
});

// 🎯 标记为MobX actions
Object.keys(circleStore).forEach(key => {
  if (typeof circleStore[key] === 'function' && !key.startsWith('get') && !key.startsWith('_')) {
    circleStore[key] = action(circleStore[key]);
  }
});

module.exports = {
  circleStore,
  CIRCLE_STATUS
};

