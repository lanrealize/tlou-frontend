// components/home-panel/home-panel.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 预留数据字段
  },

  lifetimes: {
    attached() {
      console.log('home-panel attached');
    },
    
    detached() {
      console.log('home-panel detached');
    }
  },

  methods: {
    /**
     * 点击遮罩层关闭
     */
    onMaskTap() {
      this.triggerEvent('close');
    },

    /**
     * 阻止滚动穿透
     */
    preventMove() {
      return false;
    }
  }
});

