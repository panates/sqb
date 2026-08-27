import '@sqb/mariadb-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { MariadbAdapter } from './mariadb-adapter.js';

export * from './mariadb-adapter.js';
export * from './mariadb-connection.js';
export * from './mariadb-cursor.js';

AdapterRegistry.register(new MariadbAdapter());
