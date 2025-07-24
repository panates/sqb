import { SerializerRegistry } from '@sqb/builder';
import { OracleSerializer } from './oracle-serializer.js';

SerializerRegistry.register(new OracleSerializer());
