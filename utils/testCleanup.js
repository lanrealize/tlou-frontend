// 临时测试文件：测试清理接口
// 在控制台运行：require('./utils/testCleanup.js').testCleanup()

function testCleanup() {
  const { BACKEND_CONFIG } = require('./devTools.js');
  const app = getApp();
  const baseUrl = app ? app.globalData.baseUrl : 'https://www.wltech-service.site/api/tlou';
  const testOpenid = 'test_123_fake';
  
  const fullUrl = `${baseUrl}/wechat/delete-account`;
  
  console.log('========================================');
  console.log('🧪 测试清理接口');
  console.log('========================================');
  console.log('baseUrl:', baseUrl);
  console.log('完整 URL:', fullUrl);
  console.log('测试 openid:', testOpenid);
  console.log('========================================');
  
  wx.request({
    url: fullUrl,
    method: 'DELETE',
    header: {
      'Content-Type': 'application/json',
      'x-openid': testOpenid
    },
    success: (res) => {
      console.log('✅ 请求成功');
      console.log('状态码:', res.statusCode);
      console.log('响应数据:', res.data);
    },
    fail: (error) => {
      console.error('❌ 请求失败');
      console.error('错误信息:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
    },
    complete: () => {
      console.log('========================================');
    }
  });
}

module.exports = { testCleanup };

