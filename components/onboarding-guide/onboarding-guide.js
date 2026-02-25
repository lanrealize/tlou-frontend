// components/onboarding-guide/onboarding-guide.js
const navigationHelper = require('../../utils/navigationHelper');

Component({
  properties: {},

  data: {
    headerTop: 0
  },

  lifetimes: {
    attached() {
      const menuInfo = wx.getMenuButtonBoundingClientRect();
      this.setData({ headerTop: menuInfo.bottom + 24 });
    }
  },

  methods: {
    onTakePhoto() {
      this.triggerEvent('takePhoto');
    }
  }
});
