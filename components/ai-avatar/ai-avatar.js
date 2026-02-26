// components/ai-avatar/ai-avatar.js
Component({
  properties: {
    mode: {
      type: String,
      value: 'dynamic'
    },
    dynamicIndex: {
      type: Number,
      value: 8
    },
    staticIndex: {
      type: Number,
      value: 4
    },
    size: {
      type: Number,
      value: 28
    }
  },
  data: {
    wrapSize: 38,
    dynamicOpacity: 1,
    staticOpacity: 0
  },
  observers: {
    'size': function (size) {
      this.setData({ wrapSize: size + 10 });
    },
    'mode': function (mode) {
      if (mode === 'static') {
        this.setData({ dynamicOpacity: 0 });
        setTimeout(() => {
          this.setData({ staticOpacity: 1 });
        }, 250);
      } else {
        this.setData({ staticOpacity: 0 });
        setTimeout(() => {
          this.setData({ dynamicOpacity: 1 });
        }, 250);
      }
    }
  },
  lifetimes: {
    attached: function () {
      const size = this.data.size;
      const mode = this.data.mode;
      this.setData({
        wrapSize: size + 10,
        dynamicOpacity: mode === 'dynamic' ? 1 : 0,
        staticOpacity: mode === 'static' ? 1 : 0
      });
    }
  }
})
