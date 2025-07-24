import { getDirname } from 'cross-dirname';
import { MigrationPackageConfig } from '../../src/index.js';

export const Test1MigrationPackage: MigrationPackageConfig = {
  name: 'Test',
  baseDir: getDirname(),
  migrations: [
    {
      version: 10,
      tasks: ['test1/v010.task.sql'],
    },
    {
      version: 11,
      tasks: ['test1/v011.task.sql'],
    },
    {
      version: 12,
      tasks: [
        {
          title: 'Insert data to table1',
          tableName: 'table1',
          rows: [
            { id: 1, name: 'name1' },
            { id: 2, name: 'name2' },
          ],
        },
      ],
    },
  ],
};
