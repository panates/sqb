process.env.TS_NODE_PROJECT = __dirname + '/tsconfig-test.json';

const isRoot = process.cwd() === __dirname;
process.env.INIT_POSTGRES = isRoot && 'true';

/** @type {import('mocha').MochaOptions} */
module.exports = {
  require: [
    '@swc-node/register/esm-register',
    __dirname + '/support/test/global-setup.ts',
  ],
  extension: ['ts'],
  spec: [
    './packages/builder/test/**/*.*spec.ts',
    './packages/connect/test/**/*.*spec.ts',
  ],
  parallel: false,
  timeout: 30000,
};
