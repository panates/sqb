import '@sqb/mysql-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { MysqlAdapter } from './mysql-adapter.js';

export * from './mysql-adapter.js';
export * from './mysql-connection.js';
export * from './mysql-cursor.js';

AdapterRegistry.register(new MysqlAdapter());
