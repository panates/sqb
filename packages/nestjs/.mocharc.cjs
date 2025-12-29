const baseConfig = require('../../.mocharc.cjs');

// process.env.SQB_DIALECT = 'postgres';
// process.env.SQB_PASSWORD = 'postgres';

/** @type {import('mocha').MochaOptions} */
module.exports = {
  ...baseConfig,
  spec: 'test/**/*.*spec.ts',
};
