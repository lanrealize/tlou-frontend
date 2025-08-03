// pages/list/list.js
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    circles: [],              // 朋友圈列表
    loading: false,           // 加载状态
    refreshing: false,        // 刷新状态
    showCreateDialog: false,  // 显示创建朋友圈对话框
    newCircleName: '',        // 新朋友圈名称
    newCircleIsPublic: false, // 新朋友圈是否公开
    showJoinDialog: false,    // 显示加入朋友圈对话框
    joinCircleId: '',         // 要加入的朋友圈ID
    isHistoryMode: false,     // 是否是历史记录模式
    pageTitle: '我的朋友圈',   // 页面标题
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44
    }
  },

  onLoad(options) {
    console.log('朋友圈管理页面加载', options);
    
    // 检查是否是历史记录模式
    const isHistoryMode = options.mode === 'history';
    const pageTitle = isHistoryMode ? '历史记录' : '我的朋友圈';
    
    this.setData({
      isHistoryMode,
      pageTitle
    });
    
    this.getSafeAreaInfo();
    this.loadCircles();
  },

  // 获取安全区域信息
  getSafeAreaInfo() {
    const app = getApp();
    if (app && app.globalData.safeAreaInfo) {
      this.setData({
        safeAreaInfo: app.globalData.safeAreaInfo
      });
    }
  },

  onShow() {
    // 检查是否从详情页返回，如果是则稍微延迟刷新，确保后端活动记录已更新
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const prevPage = pages[pages.length - 2];
    
    const isFromDetailsPage = prevPage && prevPage.route === 'pages/details/details';
    
    if (isFromDetailsPage) {
      // 给后端一点时间更新用户活动记录
      setTimeout(() => {
        this.loadCircles();
      }, 300);
    } else {
      // 每次显示时刷新数据
      this.loadCircles();
    }
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
      let res;
      if (this.data.isHistoryMode) {
        // 历史记录模式：获取用户参与的所有朋友圈
        res = await api.circles.getMyParticipated();
      } else {
        // 普通模式：获取我的朋友圈
        res = await api.circles.getMy();
      }
      
      const circles = res.data.circles || [];

      // 格式化数据
      circles.forEach(circle => {
        circle.formattedTime = util.formatRelativeTime(circle.createdAt);
        circle.memberCount = circle.members ? circle.members.length : 0;
        
        // 处理最新帖子信息
        if (circle.latestPost) {
          circle.latestPost.formattedTime = util.formatRelativeTime(circle.latestPost.createdAt);
        }
        
        // 为历史记录模式格式化最后更新时间显示
        if (this.data.isHistoryMode) {
          circle.lastUpdateFormatted = util.formatRelativeTime(
            circle.latestPost ? circle.latestPost.createdAt : circle.createdAt
          );
        }
      });

      // 历史记录模式：后端已按最新活动时间排序，无需前端重新排序

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

  // 显示创建朋友圈对话框
  showCreateDialog() {
    this.setData({
      showCreateDialog: true,
      newCircleName: '',
      newCircleIsPublic: false
    });
  },

  // 隐藏创建朋友圈对话框
  hideCreateDialog() {
    this.setData({ showCreateDialog: false });
  },

  // 输入朋友圈名称
  onCircleNameInput(e) {
    this.setData({ newCircleName: e.detail.value });
  },

  // 切换公开状态
  onPublicSwitchChange(e) {
    this.setData({ newCircleIsPublic: e.detail.value });
  },

  // 创建朋友圈
  async createCircle() {
    const { newCircleName, newCircleIsPublic } = this.data;

    if (util.isEmpty(newCircleName)) {
      util.showToast('请输入朋友圈名称');
      return;
    }

    if (newCircleName.length > 20) {
      util.showToast('朋友圈名称不能超过20个字符');
      return;
    }

    try {
      util.showLoading('创建中...');

      const data = {
        name: newCircleName.trim(),
        isPublic: newCircleIsPublic
      };

      await api.circles.create(data);

      util.hideLoading();
      util.showToast('创建成功');

      // 隐藏对话框
      this.hideCreateDialog();

      // 刷新列表
      this.loadCircles();

    } catch (error) {
      util.hideLoading();
      console.error('创建朋友圈失败:', error);
      util.showToast('创建失败');
    }
  },

  // 显示加入朋友圈对话框
  showJoinDialog() {
    this.setData({
      showJoinDialog: true,
      joinCircleId: ''
    });
  },

  // 隐藏加入朋友圈对话框
  hideJoinDialog() {
    this.setData({ showJoinDialog: false });
  },

  // 输入朋友圈ID
  onJoinIdInput(e) {
    this.setData({ joinCircleId: e.detail.value });
  },

  // 加入朋友圈
  async joinCircle() {
    const { joinCircleId } = this.data;

    if (util.isEmpty(joinCircleId)) {
      util.showToast('请输入朋友圈ID');
      return;
    }

    try {
      util.showLoading('加入中...');

      await api.circles.join(joinCircleId.trim());

      util.hideLoading();
      util.showToast('加入成功');

      // 隐藏对话框
      this.hideJoinDialog();

      // 刷新列表
      this.loadCircles();

    } catch (error) {
      util.hideLoading();
      console.error('加入朋友圈失败:', error);
      const message = error.message || '加入失败';
      util.showToast(message);
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
    const { circleId } = e.currentTarget.dataset;
    
    if (this.data.isHistoryMode) {
      // 历史记录模式：跳转到详情页面
      wx.navigateTo({
        url: `/pages/details/details?circleId=${circleId}`
      });
    } else {
      // 普通模式：切换到主页面并传递朋友圈ID
      wx.switchTab({
        url: '/pages/main/main'
      });
      
      // 通过全局数据传递选中的朋友圈ID
      getApp().globalData.selectedCircleId = circleId;
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