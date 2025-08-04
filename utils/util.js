// utils/util.js
// 通用工具函数

/**
 * 格式化时间
 * @param {Date|string|number} date 日期
 * @param {string} format 格式，默认 'YYYY-MM-DD HH:mm:ss'
 */
const formatTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = d.getSeconds();

  const pad = (n) => n < 10 ? '0' + n : n;

  return format
    .replace('YYYY', year)
    .replace('MM', pad(month))
    .replace('DD', pad(day))
    .replace('HH', pad(hour))
    .replace('mm', pad(minute))
    .replace('ss', pad(second));
};

/**
 * 相对时间格式化
 * @param {Date|string|number} date 日期
 */
const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();
  
  if (diff < 0) return '刚刚';
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < week) {
    return Math.floor(diff / day) + '天前';
  } else if (diff < month) {
    return Math.floor(diff / week) + '周前';
  } else if (diff < year) {
    return Math.floor(diff / month) + '个月前';
  } else {
    return Math.floor(diff / year) + '年前';
  }
};

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} limit 限制时间
 */
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 显示Toast
 * @param {string} title 标题
 * @param {string} icon 图标类型
 * @param {number} duration 持续时间
 */
const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({
    title,
    icon,
    duration
  });
};

/**
 * 显示加载中
 * @param {string} title 标题
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  });
};

/**
 * 隐藏加载中
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示确认对话框
 * @param {string} content 内容
 * @param {string} title 标题
 */
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
};

/**
 * 图片预览
 * @param {string} current 当前图片URL
 * @param {Array} urls 图片URL数组
 */
const previewImage = (current, urls = [current]) => {
  wx.previewImage({
    current,
    urls
  });
};

/**
 * 复制到剪贴板
 * @param {string} data 要复制的数据
 */
const setClipboardData = (data) => {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data,
      success: () => {
        showToast('已复制到剪贴板');
        resolve();
      },
      fail: reject
    });
  });
};

/**
 * 检查字符串是否为空
 * @param {string} str 字符串
 */
const isEmpty = (str) => {
  return !str || str.trim() === '';
};

/**
 * 截取字符串
 * @param {string} str 字符串
 * @param {number} length 长度
 * @param {string} suffix 后缀
 */
const truncate = (str, length, suffix = '...') => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

/**
 * 生成随机ID
 * @param {number} length 长度
 */
const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 获取用户位置
 */
const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: resolve,
      fail: reject
    });
  });
};

/**
 * 选择图片
 * @param {number} count 最大选择数量
 * @param {Array} sizeType 图片尺寸类型
 * @param {Array} sourceType 图片来源
 */
const chooseImage = (count = 9, sizeType = ['original', 'compressed'], sourceType = ['album', 'camera']) => {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count,
      sizeType,
      sourceType,
      success: resolve,
      fail: reject
    });
  });
};

/**
 * 页面跳转
 * @param {string} url 页面URL
 * @param {boolean} redirect 是否重定向
 */
const navigateTo = (url, redirect = false) => {
  if (redirect) {
    wx.redirectTo({ url });
  } else {
    wx.navigateTo({ url });
  }
};

/**
 * 返回上一页
 * @param {number} delta 返回页面数
 */
const navigateBack = (delta = 1) => {
  wx.navigateBack({ delta });
};

/**
 * 生成默认朋友圈名字
 * 格式：YYYY年 季节（如：2025年 夏天）
 */
const generateDefaultCircleName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() 返回 0-11
  
  let season = '';
  if (month >= 3 && month <= 5) {
    season = '春天';
  } else if (month >= 6 && month <= 8) {
    season = '夏天';
  } else if (month >= 9 && month <= 11) {
    season = '秋天';
  } else {
    season = '冬天';
  }
  
  return `${year}年 ${season}`;
};

/**
 * 智能导航到主页面
 * 检查页面栈，如果上一个页面是main则返回，否则重启到main
 */
const navigateToMain = () => {
  const pages = getCurrentPages();
  
  if (pages.length >= 2) {
    // 检查上一个页面是否是main页面
    const prevPage = pages[pages.length - 2];
    if (prevPage && prevPage.route === 'pages/main/main') {
      wx.navigateBack();
      return;
    }
  }
  
  // 否则使用reLaunch
  wx.reLaunch({
    url: '/pages/main/main'
  });
};

module.exports = {
  formatTime,
  formatRelativeTime,
  debounce,
  throttle,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  previewImage,
  setClipboardData,
  isEmpty,
  truncate,
  generateId,
  getUserLocation,
  chooseImage,
  navigateTo,
  navigateBack,
  generateDefaultCircleName,
  navigateToMain
};