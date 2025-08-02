// babel.config.js
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
  // 支持ES6模块语法
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ]
};