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
  
  // 覆盖率配置
  collectCoverageFrom: [
    'store/**/*.js',
    'utils/**/*.js',
    'components/**/*.js',
    'pages/**/*.js',
    '!**/node_modules/**',
    '!**/miniprogram_npm/**',
    '!**/coverage/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
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