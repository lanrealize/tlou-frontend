// pages/list/list.js
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    circles: [],              // 朋友圈列表
    loading: false,           // 加载状态
    refreshing: false,        // 刷新状态
    pageTitle: '我的朋友圈',   // 页面标题
    currentUser: null,        // 当前用户信息
    // 导航栏信息
    navigationData: {
      totalNavigationHeight: 88
    }
  },

  onLoad(options) {
    console.log('朋友圈列表页面加载', options);
    this.getCurrentUser();
    this.loadCircles();
  },

  // 获取当前用户信息
  getCurrentUser() {
    try {
      const app = getApp();
      const userStore = app?.getUserStore();
      
      if (userStore && userStore.isLoggedIn && userStore.userInfo) {
        this.setData({
          currentUser: userStore.userInfo
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  },

  // 检查当前用户是否为朋友圈创建者
  checkIsCircleOwner(circle) {
    const { currentUser } = this.data;
    
    if (!currentUser || !circle || !circle.creator) {
      return false;
    }
    
    // 支持creator为对象或字符串ID
    const creatorId = typeof circle.creator === 'object' ? circle.creator._id : circle.creator;
    const isOwner = currentUser._id === creatorId;
    
    return isOwner;
  },

  // 处理导航栏准备完成事件
  onNavigationReady(event) {
    const { navigationData } = event.detail;
    // 确保 navigationData 存在且包含必要字段
    if (navigationData && navigationData.totalNavigationHeight) {
      this.setData({
        navigationData: navigationData
      });
    } else {
      // 如果事件数据有问题，使用当前 data 中的默认值
      console.warn('导航栏数据不完整，使用默认值');
    }
  },

  onShow() {
    // 每次显示时都获取最新的用户信息和数据
    this.getCurrentUser();
    this.loadCircles();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadCircles().finally(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    });
  },

  // 加载朋友圈列表
  async loadCircles() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 获取用户参与的所有朋友圈
      const res = await api.circles.getMyParticipated();
      const circles = res.data.circles || [];

      // 格式化数据
      circles.forEach(circle => {
        circle.formattedTime = util.formatRelativeTime(circle.createdAt);
        circle.memberCount = circle.members ? circle.members.length : 0;
        
        // 🔧 处理图片URL - 支持对象和字符串两种格式
        circle.postImageUrl = '';
        if (circle.latestPost && circle.latestPost.images && circle.latestPost.images.length > 0) {
          const firstImage = circle.latestPost.images[0];
          if (typeof firstImage === 'string') {
            circle.postImageUrl = firstImage;
          } else if (typeof firstImage === 'object' && firstImage.url) {
            circle.postImageUrl = firstImage.url;
          }
        }
        
        // 处理最新帖子信息
        if (circle.latestPost) {
          circle.latestPost.formattedTime = util.formatRelativeTime(circle.latestPost.createdAt);
        }
        
        // 格式化最后更新时间显示
        circle.lastUpdateFormatted = util.formatRelativeTime(
          circle.latestPost ? circle.latestPost.createdAt : circle.createdAt
        );

        // 添加删除权限判断
        circle.hasDeletePermission = this.checkIsCircleOwner(circle);
      });

      // 按更新时间排序（最新的在前面）
      circles.sort((a, b) => {
        const aTime = a.latestPost ? new Date(a.latestPost.createdAt) : new Date(a.createdAt);
        const bTime = b.latestPost ? new Date(b.latestPost.createdAt) : new Date(b.createdAt);
        return bTime - aTime; // 降序排序，最新的在前面
      });

      this.setData({
        circles,
        loading: false
      });

    } catch (error) {
      console.error('加载朋友圈失败:', error);
      util.showToast('加载失败');
      this.setData({ loading: false });
    }
  },

  // 退出朋友圈
  async leaveCircle(e) {
    const { circleId, circleName } = e.currentTarget.dataset;

    const confirm = await util.showConfirm(`确定要退出朋友圈"${circleName}"吗？`, '提示');
    if (!confirm) return;

    try {
      util.showLoading('退出中...');

      await api.circles.leave(circleId);

      util.hideLoading();
      util.showToast('退出成功');

      // 刷新列表
      this.loadCircles();

    } catch (error) {
      util.hideLoading();
      console.error('退出朋友圈失败:', error);
      const message = error.message || '退出失败';
      util.showToast(message);
    }
  },

  // 跳转到朋友圈详情（发布帖子）
  goToCircleDetail(e) {
    const { circleId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/publish/publish?circleId=${circleId}`
    });
  },

  // 查看朋友圈动态
  viewCirclePosts(e) {
    // 兼容新组件事件和原来的点击事件
    let circleId;
    if (e.detail && e.detail.circleId) {
      // 来自新组件的事件
      circleId = e.detail.circleId;
    } else if (e.currentTarget && e.currentTarget.dataset) {
      // 原来的点击事件
      circleId = e.currentTarget.dataset.circleId;
    }
    
    if (!circleId) {
      return;
    }
    
    wx.navigateTo({
      url: `/pages/details/details?circleId=${circleId}&source=list`
    });
  },

  // 删除朋友圈
  onCircleDelete(e) {
    const { circleId, circleData } = e.detail;
    const circleName = circleData.name || '朋友圈';
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${circleName}"吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          this.deleteCircle(circleId);
        }
      }
    });
  },

  // 执行删除朋友圈操作
  async deleteCircle(circleId) {
    try {
      util.showLoading('删除中...');
      
      // 这里调用删除API，需要根据你的API接口调整
      await api.circles.delete(circleId);
      
      util.hideLoading();
      util.showToast('删除成功');
      
      // 刷新列表
      this.loadCircles();
      
    } catch (error) {
      util.hideLoading();
      console.error('删除朋友圈失败:', error);
      const message = error.message || '删除失败';
      util.showToast(message);
    }
  },

  // 复制朋友圈ID
  copyCircleId(e) {
    const { circleId } = e.currentTarget.dataset;
    util.setClipboardData(circleId);
  },

  // 分享朋友圈
  shareCircle(e) {
    const { circleId, circleName } = e.currentTarget.dataset;
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    // 这里可以实现分享逻辑
    util.showToast('朋友圈ID已复制，可分享给好友');
    util.setClipboardData(circleId);
  },

  // 返回主页面
  navigateToMain() {
    util.navigateToMain();
  },

  // 长按菜单
  onCircleLongPress(e) {
    const { circleId, circleName, isCreator } = e.currentTarget.dataset;
    
    const actions = ['查看动态', '复制ID', '分享'];
    if (!isCreator) {
      actions.push('退出朋友圈');
    }

    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const index = res.tapIndex;
        switch (index) {
          case 0: // 查看动态
            this.viewCirclePosts({ currentTarget: { dataset: { circleId } } });
            break;
          case 1: // 复制ID
            this.copyCircleId({ currentTarget: { dataset: { circleId } } });
            break;
          case 2: // 分享
            this.shareCircle({ currentTarget: { dataset: { circleId, circleName } } });
            break;
          case 3: // 退出朋友圈
            if (!isCreator) {
              this.leaveCircle({ currentTarget: { dataset: { circleId, circleName } } });
            }
            break;
        }
      }
    });
  }
});