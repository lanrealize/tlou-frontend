// components/quota-panel/quota-panel.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {},

  methods: {
    onMaskTap() {
      this.triggerEvent('close');
    },

    preventMove() {
      return false;
    }
  }
});
