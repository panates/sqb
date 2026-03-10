import '@sqb/oracle-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { OraAdapter } from './ora-adapter.js';

export * from './constants.js';
export * from './ora-adapter.js';
export * from './ora-connection.js';

AdapterRegistry.register(new OraAdapter());
