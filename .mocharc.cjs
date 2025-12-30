process.env.TS_NODE_PROJECT = __dirname + '/tsconfig-test.json';

const isRoot = process.cwd() === __dirname;
process.env.INIT_ELASTIC = isRoot && 'true';
process.env.INIT_MONGODB = isRoot && 'true';
process.env.INIT_SQB = isRoot && 'true';

/** @type {import('mocha').MochaOptions} */
module.exports = {
  require: [
    '@swc-node/register/esm-register',
    __dirname + '/support/test/global-setup.ts',
  ],
  extension: ['ts'],
  spec: './packages/*/test/**/*.*spec.ts',
  timeout: 30000,
};
