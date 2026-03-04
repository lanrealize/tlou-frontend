/**
 * Gatekeeper 配置
 *
 * 门的类型：
 *   profileComplete  - 需要完善个人资料（当前禁用）
 *   purchase         - 需要购买（当前禁用）
 *   quota            - 每日使用配额（本地快照检查）
 *
 * rate limit 不在前端检查，依赖后端 429 响应处理。
 *
 * 动作配置：每个动作声明需要过哪些门，按顺序检查
 */

module.exports = {

  gates: {
    profileComplete: {
      enabled: false,           // 当前不启用，基础设施备用
      popup: 'userInfo',
    },

    purchase: {
      enabled: false,           // 当前不启用，基础设施备用
      popup: 'purchase',
    },

    quota: {
      enabled: true,
      limits: {
        post:    { firstDay: 7,  daily: 5  },
        comment: { firstDay: 30, daily: 20 },
      },
    },
  },

  // 动作 → 门列表（按顺序检查，任一不过则拦截）
  // 格式：'gateType:resourceType'，无 resource 则直接写 'gateType'
  actions: {
    publishPost:  ['profileComplete', 'quota:post'],
    sendComment:  ['profileComplete', 'quota:comment'],
  },

};
