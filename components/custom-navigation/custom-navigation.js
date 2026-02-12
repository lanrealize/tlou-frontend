// components/custom-navigation/custom-navigation.js
const navigationHelper = require('../../utils/navigationHelper');

Component({
  options: {
    // 启用多插槽支持
    multipleSlots: true
  },
  
  properties: {
    // 导航栏标题
    title: {
      type: String,
      value: '标题'
    },
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      value: true
    },
    // 自定义返回逻辑
    customBack: {
      type: Boolean,
      value: false
    },
    // 是否显示操作栏
    showActionBar: {
      type: Boolean,
      value: false
    },
    // 返回按钮图标类型：'back' 或 'home'
    backIconType: {
      type: String,
      value: 'back'
    }
  },

  data: {
    // 导航栏数据 - 设置初始默认值，确保首次渲染不会出现 undefined
    navigationData: {
      statusBarHeight: 44,
      navigationBarHeight: 44,
      totalNavigationHeight: 88,
      capsuleVerticalCenter: 22
    }
  },

  lifetimes: {
    attached() {
      this.getNavigationData();
    },
    ready() {
      // 在组件布局完成时再次确保数据正确
      if (!this.data.navigationData || !this.data.navigationData.totalNavigationHeight) {
        this.getNavigationData();
      }
    }
  },

  methods: {
    // 获取导航栏数据
    getNavigationData() {
      try {
        let navData;
        
        // 获取系统信息和胶囊按钮信息
        const systemInfo = wx.getSystemInfoSync();
        const statusBarHeight = systemInfo.statusBarHeight || this.data.navigationData.statusBarHeight;
        const navigationBarHeight = 44;
        
        // 获取胶囊按钮信息
        let capsuleInfo = { width: 96, height: 32, left: 0, right: 96 };
        try {
          capsuleInfo = wx.getMenuButtonBoundingClientRect();
        } catch (e) {
          console.warn('获取胶囊按钮信息失败，使用默认值');
        }
        
        navData = {
          statusBarHeight,
          navigationBarHeight,
          totalNavigationHeight: statusBarHeight + navigationBarHeight,
          capsuleVerticalCenter: statusBarHeight + navigationBarHeight / 2,
          // 胶囊按钮信息
          capsuleInfo: capsuleInfo,
          // 计算右侧安全区域（避开胶囊按钮）
          rightSafeAreaLeft: capsuleInfo.left - 16, // 胶囊左边缘再减16px间距
          capsuleWidth: capsuleInfo.width,
          windowWidth: systemInfo.windowWidth
        };
        
        this.setData({
          navigationData: navData
        });
        
        // 触发导航栏数据更新事件
        this.triggerEvent('navigationReady', {
          navigationData: navData
        });
      } catch (error) {
        console.error('获取导航栏数据失败:', error);
        // 使用默认值
        const navData = {
          statusBarHeight: 44,
          navigationBarHeight: 44,
          totalNavigationHeight: 88,
          capsuleVerticalCenter: 22,
          capsuleInfo: { width: 96, height: 32, left: 0, right: 96 },
          rightSafeAreaLeft: 280,
          capsuleWidth: 96,
          windowWidth: 375
        };
        
        this.setData({
          navigationData: navData
        });
        
        // 触发导航栏数据更新事件
        this.triggerEvent('navigationReady', {
          navigationData: navData
        });
      }
    },

    // 返回按钮点击事件
    onBackTap() {
      if (this.properties.customBack) {
        // 触发自定义返回事件
        this.triggerEvent('back');
      } else {
        // 默认返回
        wx.navigateBack();
      }
    },

    // 获取导航栏高度（供外部调用）
    getNavigationHeight() {
      return this.data.navigationData.totalNavigationHeight;
    }
  },

  // 暴露给父页面的方法
  export() {
    return {
      getNavigationHeight: this.getNavigationHeight
    }
  }
});
