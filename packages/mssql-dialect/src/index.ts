import { SerializerRegistry } from '@sqb/builder';
import { MSSqlSerializer } from './ms-sql-serializer.js';

SerializerRegistry.register(new MSSqlSerializer());
