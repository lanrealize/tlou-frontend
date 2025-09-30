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
  },

  attached() {
    // 给每张卡片设置层级
    const { cards } = this.data
    this.setData({
      current_cursor: cards.findIndex(item => item)
    })
    this.getContextWidth()
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
      
      // 记录当前卡片到历史中
      if (!card_history.includes(current_cursor)) {
        card_history.push(current_cursor)
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
      if (is_reversing) return
      
      // 检查是否有历史记录
      if (card_history.length === 0) {
        this.triggerEvent('noPreviousCard')
        return
      }
      
      // 获取上一张卡片的索引
      const previousIndex = card_history.pop()
      
      this.setData({ 
        is_reversing: true,
        card_history 
      })
      
      // 执行逆向动画
      this.executeReverseAnimation(previousIndex, current_cursor)
    },

    // 执行逆向动画 - 最终修复版本
    executeReverseAnimation(targetIndex, currentIndex) {
      const { slideDuration } = this.data
      
      // 第一步：显示目标卡片并开始动画，但不改变current_cursor
      // 这样目标卡片会以最高z-index显示并执行滑入动画
      this.setData({
        reverse_animating: targetIndex,
      })
      
      // 第二步：动画完成后更新current_cursor并清理状态
      setTimeout(() => {
        this.setData({
          current_cursor: targetIndex,
          is_reversing: false,
          reverse_animating: -1,
          just_shown: -1
        })
        
        // 触发逆向滑动事件
        this.triggerEvent('cardReverseSwipe', {
          direction: 'reverse',
          target_index: targetIndex,
          previous_index: currentIndex
        })
      }, slideDuration + 50) // 动画完成后再更新状态
    },

    // 检查是否可以回退
    canGoBack() {
      return this.data.card_history.length > 0 && !this.data.is_reversing
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
