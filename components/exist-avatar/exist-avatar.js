// components/exist-avatar/exist-avatar.js
Component({
  properties: {
    type: {
      type: String,
      value: 'dynamic'
    },
    index: {
      type: Number,
      value: 1
    },
    size: {
      type: Number,
      value: 28
    }
  },
  data: {
    wrapSize: 38
  },
  observers: {
    'size': function (size) {
      this.setData({ wrapSize: size + 10 });
    }
  },
  lifetimes: {
    attached: function () {
      this.setData({ wrapSize: this.data.size + 10 });
    }
  }
})
