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
    
    // 安全区域信息
    safeAreaInfo: {
      statusBarHeight: 44
    }
  },

  // 设置状态
  setStatus(statusConstant, extraData = {}) {
    this.setData({
      status: statusConstant,
      ...extraData
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
    console.log('朋友圈设置页面加载', options);
    this.getSafeAreaInfo();
    
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

  // 加载朋友圈设置
  async loadCircleSettings() {
    const { circleId } = this.data;
    if (!circleId) return;

    this.setStatus(STATUS_CONSTANTS.LOADING);

    try {
      // 获取朋友圈详情 (与details页面保持一致的实现方式)
      const circlesRes = await api.circles.getMy();
      const circle = circlesRes.data.circles.find(c => c._id === circleId);
      
      if (!circle) {
        throw new Error('朋友圈不存在或已被删除');
      }

      // 优先使用朋友圈详情中的成员信息，如果没有则单独获取
      let members = [];
      if (circle.members && Array.isArray(circle.members)) {
        members = circle.members;
        console.log('使用朋友圈详情中的成员信息:', members);
      } else {
        try {
          const membersRes = await api.circles.getMembers(circleId);
          members = membersRes.data || [];
          console.log('单独获取的成员信息:', members);
        } catch (memberError) {
          console.warn('获取成员信息失败，使用空数组:', memberError);
          members = [];
        }
      }

      // 设置数据
      this.setData({
        circle,
        circleMembers: members,
        'settingData.isPublic': circle.isPublic || false
      });
      
      this.setStatus(STATUS_CONSTANTS.SUCCESS);

    } catch (error) {
      console.error('加载朋友圈设置失败:', error);
      this.setStatus(STATUS_CONSTANTS.ERROR);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  onShow() {
    console.log('朋友圈设置页面显示');
    this.loadCircleSettings();
    
    // 加载申请者列表（只有朋友圈主人才需要）
    this.loadAppliers();
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
      console.log('✅ 公开状态设置已同步:', newValue ? '公开' : '私密');
      
    } catch (error) {
      console.error('❌ 更新公开状态失败:', error);
      
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
      
    } catch (error) {
      console.error('添加成员失败:', error);
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
      
      this.setStatus(STATUS_CONSTANTS.SUCCESS);
      
    } catch (error) {
      console.error('移除成员失败:', error);
      wx.showToast({
        title: error.message || '移除失败',
        icon: 'none'
      });
      
      this.setStatus(STATUS_CONSTANTS.ERROR);
    }
  },



  // 返回上一页
  navigateBack() {
    wx.navigateBack({
      fail: () => {
        // 如果无法返回，则跳转到朋友圈详情页
        wx.redirectTo({
          url: `/pages/details/details?circleId=${this.data.circleId}`
        });
      }
    });
  },

  // === 申请列表管理功能 ===
  
  // 加载申请者列表
  async loadAppliers() {
    if (this.data.isLoadingAppliers) {
      return;
    }

    this.setData({ isLoadingAppliers: true });

    try {
      console.log('🔍 开始加载申请者列表');
      
      const res = await api.circles.getAppliers(this.data.circleId);
      
      if (res.success) {
        const appliers = res.data.appliers || [];
        
        this.setData({
          appliers: appliers
        });

        console.log('✅ 申请者列表加载完成:', appliers.length);
      } else {
        console.warn('⚠️ 加载申请者失败:', res.message);
      }
    } catch (error) {
      console.error('❌ 加载申请者列表失败:', error);
      wx.showToast({
        title: '加载申请列表失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoadingAppliers: false });
    }
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
      console.log('✅ 开始同意申请:', userId);

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

        console.log('✅ 申请同意成功');
      } else {
        throw new Error(res.message || '同意申请失败');
      }

    } catch (error) {
      wx.hideLoading();
      console.error('❌ 同意申请失败:', error);
      
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
      console.log('❌ 开始拒绝申请:', userId);

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

        console.log('✅ 申请拒绝成功');
      } else {
        throw new Error(res.message || '拒绝申请失败');
      }

    } catch (error) {
      wx.hideLoading();
      console.error('❌ 拒绝申请失败:', error);
      
      wx.showModal({
        title: '操作失败',
        content: error.message || '拒绝申请失败，请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ isProcessingApplication: false });
    }
  }
});