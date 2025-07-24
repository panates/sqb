import '@sqb/postgres-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { PgAdapter } from './pg-adapter.js';

AdapterRegistry.register(new PgAdapter());

export * from './pg-adapter.js';
