import panatesEslint from '@panates/eslint-config-ts';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'node_modules/**/*',
      'packages/*/node_modules/**/*',
      'packages/*/build/**/*',
      'packages/*/coverage/**/*',
      'packages/common/src/filter/antlr/**/*',
      // A doctest run writes this at the repository root, with absolute paths into each package's
      // build directory. It is untracked and machine-local, so it never exists in CI - but `rman
      // lint` runs eslint once at the root rather than once per package, so locally it is now in
      // scope and fails the run on formatting nobody wrote.
      '__doctest.mjs',
    ],
  },
  ...panatesEslint.configs.node,
  {
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
];
