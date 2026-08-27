import { SerializerRegistry } from '@sqb/builder';
import { MariadbSerializer } from './mariadb-serializer.js';

SerializerRegistry.register(new MariadbSerializer());
