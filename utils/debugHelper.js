// utils/debugHelper.js
// 调试工具：帮助定位403错误的原因

/**
 * 检查API请求时的认证状态
 */
function checkAuthState() {
  try {
    const app = getApp();
    const userStore = app?.getUserStore();
    
    const state = {
      timestamp: new Date().toISOString(),
      hasApp: !!app,
      hasUserStore: !!userStore,
      isProfileComplete: userStore?.isProfileComplete || false,
      hasUserInfo: !!userStore?.userInfo,
      hasUserId: !!userStore?.userInfo?._id,
      userId: userStore?.userInfo?._id || 'null',
      username: userStore?.userInfo?.username || 'null',
      profileStatus: userStore?.profileStatus || 'unknown',
      globalDataProfileStatus: app?.globalData?.profileStatus || 'unknown',
      globalDataHasUserInfo: !!app?.globalData?.userInfo,
      globalDataOpenid: app?.globalData?.openid || 'null',
      storageOpenid: wx.getStorageSync('openid') || 'null',
      storageHasUserInfo: !!wx.getStorageSync('userInfo')
    };
    
    console.log('🔍 认证状态检查:', state);
    return state;
  } catch (error) {
    console.error('❌ 检查认证状态失败:', error);
    return null;
  }
}

/**
 * 在API请求前检查并记录状态
 */
function logBeforeRequest(apiName, url) {
  console.log(`\n📤 准备发起请求: ${apiName}`);
  console.log(`   URL: ${url}`);
  
  const state = checkAuthState();
  
  if (!state) {
    console.error('❌ 无法获取认证状态');
    return;
  }
  
  // 检查关键问题
  const issues = [];
  
  if (!state.hasApp) {
    issues.push('⚠️ getApp() 返回 null');
  }
  
  if (!state.hasUserStore) {
    issues.push('⚠️ userStore 不存在');
  }
  
  if (!state.isProfileComplete) {
    issues.push('⚠️ userStore.isProfileComplete = false');
  }
  
  if (!state.hasUserInfo) {
    issues.push('⚠️ userStore.userInfo 为 null');
  }
  
  if (!state.hasUserId) {
    issues.push('❌ 关键问题：userStore.userInfo._id 不存在');
  }
  
  if (issues.length > 0) {
    console.error('🚨 发现问题:');
    issues.forEach(issue => console.error('  ', issue));
    
    // 检查是否有其他地方有 openid（用于认证）
    if (!state.hasUserId) {
      if (state.globalDataOpenid !== 'null') {
        console.warn('💡 globalData.openid 存在:', state.globalDataOpenid);
        console.warn('   建议：可能需要从 globalData 获取');
      }
      if (state.storageOpenid !== 'null') {
        console.warn('💡 storage 中的 openid 存在:', state.storageOpenid);
        console.warn('   建议：可能需要从 storage 获取');
      }
    }
  } else {
    console.log('✅ 认证状态正常，userId (_id):', state.userId);
  }
  
  return state;
}

/**
 * 模拟API请求，检查header
 */
function simulateAPIRequest(url, method = 'GET') {
  console.log(`\n🧪 模拟请求: ${method} ${url}`);
  
  const app = getApp();
  const userStore = app?.getUserStore();
  const header = { 'Content-Type': 'application/json' };
  
  try {
    if (userStore && userStore.isProfileComplete && userStore.userInfo?._id) {
      header['x-openid'] = userStore.userInfo._id;
      console.log('✅ header 中会包含 x-openid:', header['x-openid']);
    } else {
      console.error('❌ header 中没有 x-openid！');
      console.error('   这会导致后端返回 403 错误');
      
      // 分析原因
      if (!userStore) {
        console.error('   原因：userStore 不存在');
      } else if (!userStore.isProfileComplete) {
        console.error('   原因：userStore.isProfileComplete = false');
      } else if (!userStore.userInfo) {
        console.error('   原因：userStore.userInfo 为 null');
      } else if (!userStore.userInfo._id) {
        console.error('   原因：userStore.userInfo._id 不存在');
      }
    }
  } catch (error) {
    console.error('❌ 获取 openid 时出错:', error);
  }
  
  return header;
}

/**
 * 检查朋友圈列表数据
 */
async function checkCirclesData() {
  console.log('\n📊 检查朋友圈数据...');
  
  try {
    const api = require('./api');
    
    // 先检查认证状态
    const authState = checkAuthState();
    if (!authState?.hasUserId) {
      console.error('❌ 无法检查数据：userId (_id) 不存在');
      return;
    }
    
    // 获取朋友圈列表
    console.log('📡 调用 GET /circles/my...');
    const res = await api.circles.getMy();
    
    if (res.success && res.data.circles) {
      const circles = res.data.circles;
      console.log(`✅ 获取到 ${circles.length} 个朋友圈`);
      
      // 检查每个朋友圈
      circles.forEach((circle, index) => {
        console.log(`\n朋友圈 ${index + 1}:`);
        console.log(`  ID: ${circle._id}`);
        console.log(`  名称: ${circle.name}`);
        console.log(`  是否公开: ${circle.isPublic ? '是' : '否'}`);
        console.log(`  创建者ID: ${typeof circle.creator === 'object' ? circle.creator._id : circle.creator}`);
        console.log(`  成员数: ${circle.members?.length || 0}`);
        
        // 检查当前用户是否是成员
        const currentUserId = authState.userId;
        const isCreator = (typeof circle.creator === 'object' ? circle.creator._id : circle.creator) === currentUserId;
        const isMember = circle.members?.some(m => 
          (typeof m === 'object' ? m._id : m) === currentUserId
        );
        
        console.log(`  当前用户是创建者: ${isCreator ? '是' : '否'}`);
        console.log(`  当前用户是成员: ${isMember ? '是' : '否'}`);
        
        if (!isCreator && !isMember) {
          console.error(`  ⚠️ 警告：当前用户既不是创建者也不是成员！`);
        }
      });
      
      return circles;
    } else {
      console.error('❌ 获取朋友圈列表失败');
    }
  } catch (error) {
    console.error('❌ 检查数据时出错:', error);
  }
}

/**
 * 测试访问特定朋友圈
 */
async function testAccessCircle(circleId) {
  console.log(`\n🧪 测试访问朋友圈: ${circleId}`);
  
  // 检查认证状态
  const authState = checkAuthState();
  if (!authState?.hasUserId) {
    console.error('❌ 测试失败：userId (_id) 不存在');
    return;
  }
  
  try {
    const api = require('./api');
    
    console.log('📡 调用 GET /circles/' + circleId + '...');
    const res = await api.circles.getDetail(circleId);
    
    if (res.success && res.data.circle) {
      console.log('✅ 成功访问朋友圈');
      console.log('   名称:', res.data.circle.name);
      return res.data.circle;
    } else {
      console.error('❌ 访问失败:', res.message);
    }
  } catch (error) {
    console.error('❌ 访问朋友圈时出错:', error.message);
    
    if (error.response) {
      console.error('   HTTP 状态码:', error.response.status);
      console.error('   错误信息:', error.response.data);
      
      if (error.response.status === 403) {
        console.error('\n🚨 403 错误分析:');
        console.error('   1. 检查是否携带了 x-openid:');
        simulateAPIRequest('/circles/' + circleId, 'GET');
      }
    }
    
    return null;
  }
}

/**
 * 完整的诊断流程
 */
async function fullDiagnosis() {
  console.log('\n' + '='.repeat(60));
  console.log('🏥 开始完整诊断');
  console.log('='.repeat(60));
  
  // 1. 检查认证状态
  console.log('\n【步骤 1/3】检查认证状态');
  const authState = checkAuthState();
  
  if (!authState?.hasUserId) {
    console.error('\n❌ 诊断中止：userId (_id) 不存在');
    console.error('   请确保用户已登录');
    return;
  }
  
  // 2. 检查朋友圈列表
  console.log('\n【步骤 2/3】检查朋友圈列表');
  const circles = await checkCirclesData();
  
  if (!circles || circles.length === 0) {
    console.log('\n⚠️ 没有朋友圈数据');
    return;
  }
  
  // 3. 测试访问第一个朋友圈
  console.log('\n【步骤 3/3】测试访问第一个朋友圈');
  await testAccessCircle(circles[0]._id);
  
  console.log('\n' + '='.repeat(60));
  console.log('🏥 诊断完成');
  console.log('='.repeat(60));
}

module.exports = {
  checkAuthState,
  logBeforeRequest,
  simulateAPIRequest,
  checkCirclesData,
  testAccessCircle,
  fullDiagnosis
};

