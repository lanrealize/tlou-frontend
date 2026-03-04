/**
 * Gatekeeper 配置
 *
 * 门的类型：
 *   profileComplete  - 需要完善个人资料（当前禁用）
 *   purchase         - 需要购买（当前禁用）
 *   quota            - 每日使用配额
 *   rateLimit        - 短时频率限制（防恶意调用）
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

    rateLimit: {
      enabled: true,
      perMinute: {
        post:    3,
        comment: 6,
      },
    },
  },

  // 动作 → 门列表（按顺序检查，任一不过则拦截）
  // 格式：'gateType:resourceType'，无 resource 则直接写 'gateType'
  actions: {
    publishPost:  ['profileComplete', 'rateLimit:post',    'quota:post'],
    sendComment:  ['profileComplete', 'rateLimit:comment', 'quota:comment'],
  },

};
