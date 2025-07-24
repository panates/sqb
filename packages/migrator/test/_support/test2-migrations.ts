import { getDirname } from 'cross-dirname';
import { MigrationPackageConfig } from '../../src/index.js';

export const Test2MigrationPackage: MigrationPackageConfig = {
  name: 'Test',
  baseDir: getDirname(),
  migrations: ['test2/**/*'],
};
