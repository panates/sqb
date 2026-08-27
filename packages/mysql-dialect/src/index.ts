import { SerializerRegistry } from '@sqb/builder';
import { MysqlSerializer } from './mysql-serializer.js';

SerializerRegistry.register(new MysqlSerializer());
