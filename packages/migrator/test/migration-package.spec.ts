import { getDirname } from 'cross-dirname';
import { expect } from 'expect';
import {
  isInsertDataMigrationTask,
  isSqlScriptMigrationTask,
  MigrationPackage,
} from '../src/migration-package.js';

describe('migrator:MigrationPackage', () => {
  it('should load sync', async () => {
    const pkg = await MigrationPackage.load({
      name: 'test',
      migrations: [
        {
          version: 1,
          tasks: [],
        },
      ],
    });
    expect(pkg).toEqual({
      name: 'test',
      baseDir: getDirname(),
      migrations: [
        {
          version: 1,
          baseDir: '',
          tasks: [],
        },
      ],
    });
  });

  it('should load migrations from sync function', async () => {
    const pkg = await MigrationPackage.load({
      name: 'test',
      migrations: [
        () => ({
          version: 1,
          tasks: [],
        }),
      ],
    });
    expect(pkg).toEqual({
      name: 'test',
      baseDir: getDirname(),
      migrations: [
        {
          version: 1,
          baseDir: '',
          tasks: [],
        },
      ],
    });
  });

  it('should load migrations from async function', async () => {
    const pkg = await MigrationPackage.load({
      name: 'test',
      migrations: [
        async () => ({
          version: 1,
          tasks: [],
        }),
      ],
    });
    expect(pkg).toEqual({
      name: 'test',
      baseDir: getDirname(),
      migrations: [
        {
          version: 1,
          baseDir: '',
          tasks: [],
        },
      ],
    });
  });

  it('should load migrations from glob pattern', async () => {
    const pkg = await MigrationPackage.load({
      name: 'test',
      migrations: ['_support/test2/**/*'],
    });
    expect(pkg.migrations.length).toEqual(2);
    const tasks = pkg.migrations[0].tasks;
    expect(tasks).toBeDefined();
    expect(tasks.length).toEqual(2);
    expect(isSqlScriptMigrationTask(tasks[0])).toBeTruthy();
    expect(isInsertDataMigrationTask(tasks[1])).toBeTruthy();
  });

  it('should load tasks from glob pattern', async () => {
    const pkg = await MigrationPackage.load({
      name: 'test',
      migrations: [
        async () => ({
          version: 1,
          tasks: ['_support/test1/*'],
        }),
      ],
    });
    const tasks = pkg.migrations[0].tasks;
    expect(tasks).toBeDefined();
    expect(tasks.length).toEqual(2);
    expect(isSqlScriptMigrationTask(tasks[0])).toBeTruthy();
    expect(isSqlScriptMigrationTask(tasks[1])).toBeTruthy();
  });
});
