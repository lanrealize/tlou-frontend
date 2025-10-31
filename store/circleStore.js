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

  // 🎯 统一状态更新接口
  setStatus(status, data = {}) {
    this.status = status;
    this.isLoading = false;
    
    switch (status) {
      case CIRCLE_STATUS.LOADED:
        this.errorMessage = '';
        break;
        
      case CIRCLE_STATUS.ERROR:
        this.errorMessage = data.message || '加载朋友圈失败';
        break;
        
      case CIRCLE_STATUS.EMPTY:
        this.recentCircle = null;
        this.circles = [];
        this.errorMessage = '';
        break;
        
      case CIRCLE_STATUS.LOADING:
        this.isLoading = true;
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
   * 静默加载最近朋友圈
   * 从后端获取数据，比对后决定是否更新UI
   * @param {Boolean} forceUpdate - 是否强制更新（显示loading）
   * @param {Boolean} withAnimation - 是否使用切换动画（身份变化时自动禁用）
   */
  async loadRecentCircle(forceUpdate = false, withAnimation = true) {
    // 🔧 检测身份变化（管理员切换虚拟身份）
    const app = getApp();
    const userStore = app.getUserStore();
    const currentUserId = userStore?.userInfo?._id;
    
    // 如果身份变化了，强制刷新（无动画，显示 loading）
    const userChanged = this.currentUserId && currentUserId !== this.currentUserId;
    if (userChanged) {
      forceUpdate = true;
      withAnimation = false;  // 身份变化时使用 loading 而非动画
    }
    
    // 更新当前用户ID
    this.currentUserId = currentUserId;
    
    // 强制更新时显示loading
    if (forceUpdate) {
      this.setStatus(CIRCLE_STATUS.LOADING);
    }

    try {
      // 调用后端接口
      const res = await api.circles.getMyParticipated();
      const circles = res.data.circles || [];
      
      // 保存所有朋友圈（备用）
      this.circles = circles;
      
      // 🔧 按最近活动时间排序（确保最新的排在前面）
      const sortedCircles = [...circles].sort((a, b) => {
        const timeA = a.latestPost?.createdAt || a.createdAt || 0;
        const timeB = b.latestPost?.createdAt || b.createdAt || 0;
        // 降序排列（最新的在前）
        return new Date(timeB) - new Date(timeA);
      });
      
      // 获取最近活动的朋友圈（排序后的第一个）
      const newRecentCircle = sortedCircles.length > 0 ? sortedCircles[0] : null;
      
      // 设置数据（带动画）
      const wasUpdated = await this.setRecentCircle(
        newRecentCircle, 
        withAnimation && !forceUpdate  // 非强制更新时才使用动画
      );
      
      // 更新状态
      if (newRecentCircle) {
        this.setStatus(CIRCLE_STATUS.LOADED);
      } else {
        this.setStatus(CIRCLE_STATUS.EMPTY);
      }
      
      return { success: true, updated: wasUpdated };
      
    } catch (error) {
      console.error('❌ [circleStore] 加载失败:', error);
      this.setStatus(CIRCLE_STATUS.ERROR, { 
        message: error.message || '加载朋友圈失败' 
      });
      return { success: false, error };
    }
  },

  /**
   * 强制刷新（显示loading）
   */
  async forceRefresh() {
    return await this.loadRecentCircle(true, false);
  },

  /**
   * 重置状态
   */
  reset() {
    this.status = CIRCLE_STATUS.EMPTY;
    this.recentCircle = null;
    this.circles = [];
    this.isLoading = false;
    this.isUpdating = false;
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

