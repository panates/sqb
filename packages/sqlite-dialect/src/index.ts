import { SerializerRegistry } from '@sqb/builder';
import { SqliteSerializer } from './sqlite-serializer.js';

SerializerRegistry.register(new SqliteSerializer());
