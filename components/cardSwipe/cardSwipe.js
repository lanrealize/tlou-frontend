/*
 * @Author: jesse zhao 
 * @Date: 2020-04-07 02:41:53 
 * @Last Modified by: jesse zhao
 * @Last Modified time: 2020-04-20 03:13:52
 * @github: https://github.com/1esse/cardSwipe
 */

Component({
  properties: {
    cards: Array, // 卡片数据，一个包含所有卡片对象的数组
    removedCards: Array, // 存放已经移除的卡片的索引数据，如果索引填充了其他卡片，需要将该索引移出
    transition: Boolean, // 是否开启过渡动画
    circling: Boolean, // 是否列表循环
    rotateDeg: Number, // 整个滑动过程旋转角度
    showCards: { // 显示几张卡片
      type: Number,
      value: 3
    },
    slideDuration: { // 手指离开屏幕后滑出界面时长，单位(ms)毫秒
      type: Number,
      value: 200
    },
    slideThershold: { // 松手后滑出界面阈值，单位px
      type: Number,
      value: 60
    },
    upHeight: { // 下层卡片下移高度，单位px
      type: Number,
      value: 40
    },
    scaleRatio: { // 下层卡片收缩力度
      type: Number,
      value: 0.05
    },
  },

  observers: {
    cards(nc, oc) {
      if (!nc) return
      this.cardReflect()
    },
    showCards(nc, oc) { // 用于展示调节用，一般情况下展示卡片数量是固定的，不需要监听变化。
      if (!nc) return
      this.cardReflect()
    }
  },

  data: {
    just_shown: -1, // 如果显示卡片的数量和卡片总数量一样，那么开启循环的时候，被设置过transform的节点不会重新渲染，这会导致已经滑出界面的卡片无法回归原位，这个字段就是用来控制滑出卡片重新渲染的
    card_history: [], // 卡片浏览历史
    is_reversing: false, // 是否正在执行逆向动画
    reverse_animating: -1, // 正在进行逆向动画的卡片索引
    reverse_direction: '', // 逆向动画方向：'from-left' 或 'from-right'
  },

  attached() {
    // 给每张卡片设置层级
    const { cards } = this.data
    this.setData({
      current_cursor: cards.findIndex(item => item)
    })
    this.getContextWidth()
    
    console.log('[CardSwipe] 组件已挂载, 卡片数量:', cards.length)
  },

  detached() {
    // 清理定时器
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout)
      this.animationTimeout = null
    }
    
    console.log('[CardSwipe] 组件已卸载')
  },

  methods: {
    cardReflect() {
      let { cards, showCards } = this.data
      let sc = showCards
      if (showCards < 1) sc = 1
      else if (showCards > cards.filter(item => item).length) sc = cards.filter(item => item).length
      this.setData({
        current_z_index: new Array(sc).fill(0).map((_, index) => index + 1).reverse(),
        sc: sc
      })
    },

    getContextWidth() {
      const query = this.createSelectorQuery()
      query.select('.wrapper').boundingClientRect()
      query.exec((res) => {
        const contextWidth = res[0].width
        this.setData({
          contextWidth
        })
      })
    },
    nextCard(e) {
      let { current_cursor, just_shown, slideDuration, card_history } = this.data
      
      // 记录当前卡片和滑动方向到历史中
      const swipeDirection = e.direction || 'right' // 默认右滑
      const historyItem = {
        cardIndex: current_cursor,
        swipeDirection: swipeDirection,
        timestamp: Date.now()
      }
      
      // 避免重复记录同一张卡片
      const lastHistory = card_history[card_history.length - 1]
      if (!lastHistory || lastHistory.cardIndex !== current_cursor) {
        card_history.push(historyItem)
      }
      
      just_shown = current_cursor
      current_cursor = this.countCurrentCursor(current_cursor)
      Object.assign(e, {
        swiped_card_index: just_shown,
        current_cursor
      })
      setTimeout(() => {
        this.setData({
          just_shown,
          card_history
        }, () => {
          this.setData({
            just_shown: -1,
            current_cursor,
          })
        })
      }, 100)
      this.triggerEvent('cardSwipe', e)
    },

    countCurrentCursor(current_cursor) {
      const { circling, cards, removedCards } = this.data
      if (circling) // 如果开启循环
        current_cursor = current_cursor + 1 === cards.length ? 0 : current_cursor + 1
      else
        current_cursor += 1
      if (!removedCards.includes(current_cursor)) return current_cursor
      return this.countCurrentCursor(current_cursor)
    },

    // 逆向动画：回到上一张卡片
    previousCard() {
      const { card_history, current_cursor, is_reversing } = this.data
      
      // 防止重复执行
      if (is_reversing) {
        console.warn('[CardSwipe] 逆向动画正在进行中，忽略重复调用')
        return
      }
      
      // 检查是否有历史记录
      if (!Array.isArray(card_history) || card_history.length === 0) {
        console.warn('[CardSwipe] 没有历史记录可以回退')
        this.triggerEvent('noPreviousCard')
        return
      }
      
      // 获取上一张卡片的信息（包含方向）
      const previousHistoryItem = card_history.pop()
      
      // 兼容处理：支持旧格式（数字）和新格式（对象）
      let previousIndex, originalSwipeDirection
      
      if (typeof previousHistoryItem === 'number') {
        // 旧格式兼容
        previousIndex = previousHistoryItem
        originalSwipeDirection = 'right' // 默认方向
      } else if (previousHistoryItem && typeof previousHistoryItem === 'object') {
        // 新格式
        previousIndex = previousHistoryItem.cardIndex
        originalSwipeDirection = previousHistoryItem.swipeDirection || 'right'
      } else {
        console.error('[CardSwipe] 历史记录格式错误:', previousHistoryItem)
        this.triggerEvent('noPreviousCard')
        return
      }
      
      // 验证索引有效性
      if (typeof previousIndex !== 'number' || previousIndex < 0) {
        console.error('[CardSwipe] 无效的卡片索引:', previousIndex)
        this.triggerEvent('noPreviousCard')
        return
      }
      
      this.setData({ 
        is_reversing: true,
        card_history 
      })
      
      // 执行逆向动画，从原来滑出的相反方向滑入
      this.executeReverseAnimation(previousIndex, current_cursor, originalSwipeDirection)
    },

    // 执行逆向动画 - 支持方向的版本
    executeReverseAnimation(targetIndex, currentIndex, originalSwipeDirection) {
      const { slideDuration, cards } = this.data
      
      // 参数验证
      if (typeof targetIndex !== 'number' || targetIndex < 0 || targetIndex >= cards.length) {
        console.error('[CardSwipe] executeReverseAnimation: 无效的目标索引', targetIndex)
        this.setData({ is_reversing: false })
        return
      }
      
      if (typeof currentIndex !== 'number' || currentIndex < 0) {
        console.error('[CardSwipe] executeReverseAnimation: 无效的当前索引', currentIndex)
        this.setData({ is_reversing: false })
        return
      }
      
      // 根据原始滑动方向决定逆向动画方向
      // 如果原来是右滑离开，现在就从右侧滑入
      // 如果原来是左滑离开，现在就从左侧滑入
      const reverseDirection = originalSwipeDirection === 'left' ? 'from-left' : 'from-right'
      
      console.log(`[CardSwipe] 执行逆向动画: ${currentIndex} -> ${targetIndex}, 方向: ${reverseDirection}`)
      
      // 第一步：显示目标卡片并开始动画，但不改变current_cursor
      // 这样目标卡片会以最高z-index显示并执行滑入动画
      this.setData({
        reverse_animating: targetIndex,
        reverse_direction: reverseDirection, // 记录逆向动画方向
      })
      
      // 第二步：动画完成后更新current_cursor并清理状态
      const animationTimeout = setTimeout(() => {
        this.setData({
          current_cursor: targetIndex,
          is_reversing: false,
          reverse_animating: -1,
          reverse_direction: '',
          just_shown: -1
        })
        
        // 触发逆向滑动事件
        this.triggerEvent('cardReverseSwipe', {
          direction: 'reverse',
          reverse_direction: reverseDirection,
          original_swipe_direction: originalSwipeDirection,
          target_index: targetIndex,
          previous_index: currentIndex
        })
        
        console.log(`[CardSwipe] 逆向动画完成: 当前索引 ${targetIndex}`)
      }, slideDuration + 50) // 动画完成后再更新状态
      
      // 存储timeout ID以便可能的清理
      this.animationTimeout = animationTimeout
    },

    // 检查是否可以回退
    canGoBack() {
      const { card_history, is_reversing } = this.data
      return Array.isArray(card_history) && card_history.length > 0 && !is_reversing
    },

    // 重置组件状态（用于调试和错误恢复）
    resetState() {
      console.log('[CardSwipe] 重置组件状态')
      
      // 清理定时器
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout)
        this.animationTimeout = null
      }
      
      this.setData({
        card_history: [],
        is_reversing: false,
        reverse_animating: -1,
        reverse_direction: '',
        just_shown: -1
      })
    },

    // 获取当前状态（用于调试）
    getDebugInfo() {
      const { card_history, current_cursor, is_reversing, reverse_animating, cards } = this.data
      return {
        currentCursor: current_cursor,
        historyLength: card_history.length,
        historyItems: card_history,
        isReversing: is_reversing,
        reverseAnimating: reverse_animating,
        totalCards: cards.length,
        canGoBack: this.canGoBack()
      }
    },

    // 转发post-card组件的事件
    onPostLike(e) {
      this.triggerEvent('like', e.detail)
    },

    onPostComment(e) {
      this.triggerEvent('comment', e.detail)
    },

    onPreviewImage(e) {
      this.triggerEvent('previewImage', e.detail)
    },

    onTapAvatar(e) {
      this.triggerEvent('tapAvatar', e.detail)
    },

    onPostMore(e) {
      this.triggerEvent('more', e.detail)
    }
  }
})
