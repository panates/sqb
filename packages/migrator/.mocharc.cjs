const baseConfig = require('../../.mocharc.cjs');
/** @type {import('mocha').MochaOptions} */
module.exports = {
  ...baseConfig,
  parallel: false,
  spec: 'test/**/*.*spec.ts',
};
