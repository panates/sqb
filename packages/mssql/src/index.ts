import '@sqb/mssql-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { MssqlAdapter } from './mssql-adapter.js';

export * from './mssql-adapter.js';
export * from './mssql-connection.js';
export * from './mssql-cursor.js';

AdapterRegistry.register(new MssqlAdapter());
