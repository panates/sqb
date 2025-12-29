import { SqbModuleOptions } from '../../../src/sqb.interface.js';

export const dbConfig: SqbModuleOptions = {
  name: 'db1',
  useValue: {
    dialect: 'postgres',
    password: 'postgres',
  },
};
