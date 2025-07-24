import { SerializerRegistry } from '@sqb/builder';
import { PostgresSerializer } from './postgres-serializer.js';

SerializerRegistry.register(new PostgresSerializer());
