// jest.config.js
module.exports = {
  // 测试环境配置为jsdom，模拟浏览器DOM环境
  testEnvironment: 'jsdom',
  
  // Jest在Node.js环境中进行测试，需要jsdom来模拟dom环境
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 配置快照序列化器，用于更好的快照测试体验
  snapshotSerializers: ['miniprogram-simulate/jest-snapshot-plugin'],
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.(js|ts)',
    '**/?(*.)+(spec|test).(js|ts)'
  ],
  
  // 模块名映射，方便测试时的路径引用
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/store/(.*)$': '<rootDir>/store/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1'
  },
  
  // 覆盖率配置 - 专注于核心业务逻辑
  collectCoverageFrom: [
    'store/**/*.js',
    'utils/**/*.js',
    '!utils/qiniuConfig.js', // 排除第三方配置
    '!utils/qiniuUploader.js', // 排除第三方上传器
    '!**/node_modules/**',
    '!**/miniprogram_npm/**',
    '!**/coverage/**'
  ],
  
  // 覆盖率阈值 - 针对核心模块的合理目标
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50, 
      lines: 50,
      statements: 50
    },
    // 为核心模块设置更高标准
    'store/**/*.js': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    },
    'utils/api.js': {
      branches: 70,
      functions: 60,
      lines: 70,
      statements: 70
    },
    'utils/util.js': {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70
    }
  },
  
  // 转换器配置
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 忽略转换的模块
  transformIgnorePatterns: [
    'node_modules/(?!(miniprogram-simulate|mobx-miniprogram)/)'
  ]
};