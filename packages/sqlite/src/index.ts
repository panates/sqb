import '@sqb/sqlite-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { SqliteAdapter } from './sqlite-adapter.js';

export * from './sqlite-adapter.js';
export * from './sqlite-connection.js';
export * from './sqlite-cursor.js';

AdapterRegistry.register(new SqliteAdapter());
