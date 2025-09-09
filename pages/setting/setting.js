// pages/setting/setting.js
const api = require('../../utils/api');
const util = require('../../utils/util');
const auth = require('../../utils/auth');

// 状态常量
const STATUS_CONSTANTS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  UPDATING: 'updating'
};

Page({
  data: {
    // 朋友圈基本信息
    circleId: '',
    circle: null,
    currentUser: null,           // 当前用户信息
    isCircleOwner: false,        // 当前用户是否为朋友圈创建者
    
    // 设置数据
    settingData: {
      isPublic: false            // 是否公开
    },
    
    // 成员管理
    circleMembers: [],
    showAddMemberDialog: false,
    newMemberInput: '',
    
    // 申请列表管理
    appliers: [],                    // 申请者列表
    isLoadingAppliers: false,        // 是否正在加载申请列表
    isProcessingApplication: false,  // 是否正在处理申请
    
    // 页面状态
    status: STATUS_CONSTANTS.LOADING,
    
    // 数据缓存相关
    lastSettingsLoadTime: 0,         // 上次设置数据加载时间
    hasInitialLoad: false,           // 是否已完成初次加载
    
    // 🎯 方案二：精确的数据变更追踪
    dataChanges: {
      circleSettings: false,         // 朋友圈设置是否有变更
      memberList: false,             // 成员列表是否有变更
      applications: false            // 申请处理是否有变更
    },
    
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44,
      totalNavigationHeight: 88
    }
  },

  // 获取安全区域信息
  getSafeAreaInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 44;
      const navigationBarHeight = 44;
      const totalNavigationHeight = statusBarHeight + navigationBarHeight;
      
      this.setData({
        safeAreaInfo: {
          statusBarHeight,
          navigationBarHeight,
          totalNavigationHeight
        }
      });
    } catch (error) {
      console.error('获取安全区域信息失败:', error);
      // 使用默认值
      this.setData({
        safeAreaInfo: {
          statusBarHeight: 44,
          navigationBarHeight: 44,
          totalNavigationHeight: 88
        }
      });
    }
  },

  // 设置状态
  setStatus(statusConstant, extraData = {}) {
    this.setData({
      status: statusConstant,
      ...extraData
    });
  },

  // 🎯 方案二：记录数据变更
  markDataChanged(changeType, hasChanged = true) {
    if (changeType === 'circleSettings' || changeType === 'memberList' || changeType === 'applications') {
      this.setData({
        [`dataChanges.${changeType}`]: hasChanged
      });
    }
  },

  // 🎯 方案二：检查是否有任何数据变更
  hasAnyDataChanges() {
    const { dataChanges } = this.data;
    return dataChanges.circleSettings || dataChanges.memberList || dataChanges.applications;
  },

  // 🎯 方案二：重置所有变更标记
  resetDataChanges() {
    this.setData({
      'dataChanges.circleSettings': false,
      'dataChanges.memberList': false,
      'dataChanges.applications': false
    });
  },

  // 检查网络状态
  checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const isConnected = res.networkType !== 'none' && res.networkType !== 'unknown';
          resolve({
            isConnected,
            networkType: res.networkType
          });
        },
        fail: () => {
          resolve({
            isConnected: false,
            networkType: 'unknown'
          });
        }
      });
    });
  },

  onLoad(options) {
    this.getSafeAreaInfo();
    this.getCurrentUser(); // 获取当前用户信息
    
    const { circleId } = options;
    if (!circleId) {
      wx.showToast({
        title: '缺少朋友圈参数',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ circleId });
    this.loadCircleSettings();
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
    
    console.log('权限检查:', {
      currentUserId: currentUser._id,
      creatorId: creatorId,
      isOwner: isOwner
    });
    
    return isOwner;
  },

  // 🚀 优化版：并行加载朋友圈设置
  async loadCircleSettings() {
    const { circleId } = this.data;
    if (!circleId) return;

    this.setStatus(STATUS_CONSTANTS.LOADING);

    try {
      // 获取朋友圈详情
      const circlesRes = await api.circles.getMy();
      const circle = circlesRes.data.circles.find(c => c._id === circleId);
      
      if (!circle) {
        throw new Error('朋友圈不存在或已被删除');
      }

      // 检查当前用户权限
      const isOwner = this.checkIsCircleOwner(circle);
      
      // 🎯 立即显示基本信息，提升用户体验
      this.setData({
        circle,
        isCircleOwner: isOwner,
        'settingData.isPublic': circle.isPublic || false,
        lastSettingsLoadTime: Date.now()
      });
      
      this.setStatus(STATUS_CONSTANTS.SUCCESS);

      // 🚀 并行加载成员信息和申请者列表
      const loadPromises = [];
      
      // 1. 加载成员信息（如果朋友圈详情中没有）
      if (circle.members && Array.isArray(circle.members)) {
        this.setData({ circleMembers: circle.members });
      } else {
        loadPromises.push(this.loadMembersAsync());
      }
      
      // 2. 如果是创建者，并行加载申请者列表
      if (isOwner) {
        loadPromises.push(this.loadAppliersAsync());
      }
      
      // 🔄 等待所有并行任务完成（不阻塞基本页面显示）
      if (loadPromises.length > 0) {
        await Promise.allSettled(loadPromises);
      }

    } catch (error) {
      console.error('加载朋友圈设置失败:', error);
      this.setStatus(STATUS_CONSTANTS.ERROR);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 🚀 异步加载成员信息
  async loadMembersAsync() {
    try {
      const membersRes = await api.circles.getMembers(this.data.circleId);
      this.setData({
        circleMembers: membersRes.data || []
      });
    } catch (error) {
      console.error('加载成员信息失败:', error);
      this.setData({ circleMembers: [] });
    }
  },

  // 🚀 异步加载申请者列表
  async loadAppliersAsync() {
    if (this.data.isLoadingAppliers) return;

    this.setData({ isLoadingAppliers: true });

    try {
      const res = await api.circles.getAppliers(this.data.circleId);
      
      if (res.success) {
        const appliers = res.data.appliers || [];
        this.setData({ appliers: appliers });
      }
    } catch (error) {
      console.error('加载申请列表失败:', error);
      // 静默失败，不影响主要功能
    } finally {
      this.setData({ isLoadingAppliers: false });
    }
  },

  onShow() {
    // 智能加载：首次显示或数据过期时才重新加载
    if (!this.data.hasInitialLoad) {
      this.loadCircleSettings(); // loadCircleSettings 内部会根据权限决定是否加载申请者列表
      this.setData({ hasInitialLoad: true });
    } else {
      const now = Date.now();
      const SETTINGS_CACHE_DURATION = 60000; // 1分钟缓存时间
      
      if (now - this.data.lastSettingsLoadTime > SETTINGS_CACHE_DURATION) {
        this.loadCircleSettings(); // loadCircleSettings 内部会根据权限决定是否加载申请者列表
      }
    }
  },

  // 切换公开状态（乐观更新模式）
  async togglePublicStatus(e) {
    const newValue = e.detail.value;
    const oldValue = this.data.settingData.isPublic;
    
    // 乐观更新：先更新UI，提供即时反馈
    this.setData({
      'settingData.isPublic': newValue
    });
    
    // 检查网络状态
    const networkInfo = await this.checkNetworkStatus();
    if (!networkInfo.isConnected) {
      wx.showToast({
        title: '网络不可用，设置将在网络恢复后同步',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    try {
      // 异步同步到后端 (使用正确的PATCH接口)
      await api.circles.updateSettings(this.data.circleId, {
        isPublic: newValue
      });
      
      // 成功后给轻量提示
      
      // 🎯 方案二：记录设置变更
      this.markDataChanged('circleSettings');
      
    } catch (error) {
      // 失败时回滚并给出明确提示
      this.setData({
        'settingData.isPublic': oldValue
      });
      
      wx.showToast({
        title: '设置失败，请检查网络后重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示添加成员对话框
  addMember() {
    this.setData({
      showAddMemberDialog: true,
      newMemberInput: ''
    });
  },

  // 隐藏添加成员对话框
  hideAddMemberDialog() {
    this.setData({
      showAddMemberDialog: false,
      newMemberInput: ''
    });
  },

  // 输入新成员信息
  onMemberInput(e) {
    this.setData({
      newMemberInput: e.detail.value
    });
  },

  // 确认添加成员
  async confirmAddMember() {
    const { newMemberInput, circleId } = this.data;
    
    if (!newMemberInput.trim()) {
      wx.showToast({
        title: '请输入用户信息',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setStatus(STATUS_CONSTANTS.UPDATING);
      
      await api.circles.addMember(circleId, {
        identifier: newMemberInput.trim()
      });
      
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
      
      this.hideAddMemberDialog();
      this.loadCircleSettings(); // 重新加载成员列表
      
      // 🎯 方案二：记录成员列表变更
      this.markDataChanged('memberList');
      
    } catch (error) {
      wx.showToast({
        title: error.message || '添加失败',
        icon: 'none'
      });
      
      this.setStatus(STATUS_CONSTANTS.ERROR);
    }
  },

  // 移除成员
  async removeMember(e) {
    const memberId = e.currentTarget.dataset.memberId;
    
    if (!memberId) {
      wx.showToast({
        title: '成员信息错误',
        icon: 'none'
      });
      return;
    }
    
    const confirm = await util.showConfirm('确定要移除该成员吗？', '移除成员');
    if (!confirm) return;
    
    try {
      this.setStatus(STATUS_CONSTANTS.UPDATING);
      
      await api.circles.removeMember(this.data.circleId, memberId);
      
      wx.showToast({
        title: '移除成功',
        icon: 'success'
      });
      
      // 从本地数据中移除 (支持多种ID字段)
      const updatedMembers = this.data.circleMembers.filter(member => 
        (member._id !== memberId) && (member.id !== memberId)
      );
      this.setData({
        circleMembers: updatedMembers
      });
      
      // 🎯 方案二：记录成员列表变更
      this.markDataChanged('memberList');
      
      this.setStatus(STATUS_CONSTANTS.SUCCESS);
      
    } catch (error) {
      wx.showToast({
        title: error.message || '移除失败',
        icon: 'none'
      });
      
      this.setStatus(STATUS_CONSTANTS.ERROR);
    }
  },



  // 🎯 方案二：智能返回 - 只在有真实变更时通知刷新
  navigateBack() {
    const pages = getCurrentPages();
    
    // 检查是否有数据变更
    const hasChanges = this.hasAnyDataChanges();

    if (pages.length >= 2) {
      const prevPage = pages[pages.length - 2];
      
      // 🎯 关键改进：只有真的有变更时才通知details页面
      if (prevPage.route === 'pages/details/details' && 
          typeof prevPage.markDataNeedsRefresh === 'function' && 
          hasChanges) {
        prevPage.markDataNeedsRefresh();
      }
      
      // 重置变更标记
      this.resetDataChanges();
      
      // 正常返回
      wx.navigateBack({
        fail: (err) => {
          wx.navigateTo({
            url: `/pages/details/details?circleId=${this.data.circleId}`,
            fail: () => {
              wx.reLaunch({
                url: '/pages/main/main'
              });
            }
          });
        }
      });
    } else {
      // 没有上一个页面，重置变更标记后跳转
      this.resetDataChanges();
      wx.navigateTo({
        url: `/pages/details/details?circleId=${this.data.circleId}`,
        fail: () => {
          wx.reLaunch({
            url: '/pages/main/main'
          });
        }
      });
    }
  },

  // 🎯 方案二：智能通知 - 基于具体变更类型精确通知
  notifyDetailsDataChanged(changeTypes = []) {
    const pages = getCurrentPages();
    const detailsPage = pages.find(page => page.route === 'pages/details/details');
    
    if (detailsPage && typeof detailsPage.markDataNeedsRefresh === 'function') {
      // 如果没有指定变更类型，检查是否有任何变更
      const hasChanges = changeTypes.length > 0 || this.hasAnyDataChanges();
      
      if (hasChanges) {
        detailsPage.markDataNeedsRefresh();
      }
    }
  },

  // === 申请列表管理功能 ===
  
  // 🔄 兼容方法：加载申请者列表（现在调用异步版本）
  async loadAppliers() {
    // 复用优化后的异步加载方法
    return this.loadAppliersAsync();
  },

  // 同意申请
  async approveApplication(e) {
    const { userId, username } = e.currentTarget.dataset;
    
    if (this.data.isProcessingApplication) {
      return;
    }

    const confirm = await util.showConfirm(
      `确定要同意 ${username} 的申请吗？`,
      '同意申请'
    );
    if (!confirm) return;

    this.setData({ isProcessingApplication: true });

    try {
      wx.showLoading({ title: '处理中...' });
      
      const res = await api.circles.approveApplication(this.data.circleId, userId);
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '已同意申请',
          icon: 'success'
        });

        // 从申请列表中移除该用户
        const updatedAppliers = this.data.appliers.filter(applier => 
          applier._id !== userId
        );
        this.setData({
          appliers: updatedAppliers
        });

        // 重新加载朋友圈设置以更新成员列表
        this.loadCircleSettings();
        
        // 🎯 方案二：记录成员和申请变更
        this.markDataChanged('memberList');
        this.markDataChanged('applications');
      } else {
        throw new Error(res.message || '同意申请失败');
      }

    } catch (error) {
      wx.hideLoading();
      
      wx.showModal({
        title: '操作失败',
        content: error.message || '同意申请失败，请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ isProcessingApplication: false });
    }
  },

  // 拒绝申请
  async rejectApplication(e) {
    const { userId, username } = e.currentTarget.dataset;
    
    if (this.data.isProcessingApplication) {
      return;
    }

    const confirm = await util.showConfirm(
      `确定要拒绝 ${username} 的申请吗？`,
      '拒绝申请'
    );
    if (!confirm) return;

    this.setData({ isProcessingApplication: true });

    try {
      wx.showLoading({ title: '处理中...' });
      
      const res = await api.circles.rejectApplication(this.data.circleId, userId);
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '已拒绝申请',
          icon: 'success'
        });

        // 从申请列表中移除该用户
        const updatedAppliers = this.data.appliers.filter(applier => 
          applier._id !== userId
        );
        this.setData({
          appliers: updatedAppliers
        });

        // 🎯 方案二：记录申请处理变更
        this.markDataChanged('applications');
      } else {
        throw new Error(res.message || '拒绝申请失败');
      }

    } catch (error) {
      wx.hideLoading();
      
      wx.showModal({
        title: '操作失败',
        content: error.message || '拒绝申请失败，请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ isProcessingApplication: false });
    }
  },

  // 退出朋友圈
  async leaveCircle() {
    const { circle } = this.data;
    
    if (!circle) {
      wx.showToast({
        title: '朋友圈信息错误',
        icon: 'none'
      });
      return;
    }

    const confirm = await util.showConfirm(
      `确定要退出朋友圈"${circle.name || '未命名朋友圈'}"吗？\n\n退出后将无法查看此朋友圈的内容，如需重新加入需要申请或邀请。`,
      '退出朋友圈'
    );
    if (!confirm) return;

    try {
      wx.showLoading({ title: '退出中...' });
      
      // 获取当前用户的openid
      const app = getApp();
      const userStore = app?.getUserStore();
      let openid;
      
      if (userStore && userStore.isLoggedIn) {
        if (userStore.isVirtualIdentity) {
          // 虚拟身份：使用虚拟用户的openid
          openid = userStore.userInfo?.openid;
        } else {
          // 真实身份：从本地存储获取
          openid = wx.getStorageSync('openid');
        }
      }
      
      if (!openid) {
        throw new Error('用户身份验证失败');
      }
      
      const res = await api.circles.leave(this.data.circleId, openid);
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '已退出朋友圈',
          icon: 'success',
          duration: 2000
        });

        // 延迟跳转到主页，让用户看到成功提示
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/main/main',
            fail: () => {
              // 如果reLaunch失败，尝试navigateBack到上一页
              wx.navigateBack({
                fail: () => {
                  // 最后的保底方案
                  wx.switchTab({
                    url: '/pages/main/main'
                  });
                }
              });
            }
          });
        }, 1500);

      } else {
        throw new Error(res.message || '退出朋友圈失败');
      }

    } catch (error) {
      wx.hideLoading();
      
      wx.showModal({
        title: '退出失败',
        content: error.message || '退出朋友圈失败，请稍后重试',
        showCancel: false
      });
    }
  }
});