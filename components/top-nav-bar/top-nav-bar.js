// components/top-nav-bar/top-nav-bar.js
Component({
  properties: {},

  data: {
    menuHeight: 32,
    menuTop: 48,
    menuLeft: 0
  },

  lifetimes: {
    attached() {
      // 从 app.globalData 读取导航栏信息（已在 app.onLaunch 中初始化）
      const app = getApp();
      if (app && app.globalData && app.globalData.navigationInfo) {
        this.setData({
          menuHeight: app.globalData.navigationInfo.menuHeight || 32,
          menuTop: app.globalData.navigationInfo.menuTop || 48,
          menuLeft: app.globalData.navigationInfo.menuLeft || 0
        });
        
        console.log('导航栏信息:', {
          menuHeight: this.data.menuHeight,
          menuTop: this.data.menuTop,
          menuLeft: this.data.menuLeft
        });
      }
    }
  },

  methods: {
    onHomeClick() {
      this.triggerEvent('homeclick');
    },
    
    onAddClick() {
      this.triggerEvent('addclick');
    }
  }
});
