//
// @pkg 📦 DeepVision ESLint Config [NestJS]
// @version 📍 1.0.0
// @author 🐳 DeepVision Team <code@deepvision.team>
//
// Documentation reference: https://eslint.org/docs/user-guide/configuring/
// ESLint versions: https://eslint.org/blog/
//

const path = require('node:path');

module.exports = {
  root: true,
  extends: ['plugin:@deep/recommended-node'],
  parserOptions: {
    project: path.join(__dirname, './tsconfig.json'),
  },
};
