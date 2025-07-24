import '@sqb/oracle-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { OraAdapter } from './ora-adapter.js';

AdapterRegistry.register(new OraAdapter());
