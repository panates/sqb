import { AdapterRegistry } from '@sqb/connect';
import { SqljsAdapter } from './sqljs-adapter.js';

AdapterRegistry.register(new SqljsAdapter());
