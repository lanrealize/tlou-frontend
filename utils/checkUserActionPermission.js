/**
 * 用户状态辅助函数
 * 职责：提供当前用户信息的获取与状态判断
 */

function getCurrentUser() {
  try {
    const app = getApp();
    const userStore = app?.getUserStore();
    if (userStore && userStore.userInfo && userStore.userInfo._id) {
      return userStore.userInfo;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getCurrentUserId() {
  const user = getCurrentUser();
  if (!user) return null;
  return user._id || user.id || null;
}

function isProfileComplete() {
  // 当前策略：不强制要求完善资料，所有用户直接放行
  // 占位保留，如需启用请改为：return getCurrentUser() !== null && !!getCurrentUser()._id;
  return true;
}

function isCurrentUserAdmin() {
  const user = getCurrentUser();
  return user?.isAdmin === true;
}

function getProfileStatus() {
  const app = getApp();
  const userStore = app.getUserStore();
  return {
    isProfileComplete: !!userStore.userInfo && !!userStore.userInfo._id,
    userId: userStore.userInfo?._id || null,
    userInfo: userStore.userInfo
  };
}

module.exports = {
  getCurrentUser,
  getCurrentUserId,
  isProfileComplete,
  isCurrentUserAdmin,
  getProfileStatus
};
