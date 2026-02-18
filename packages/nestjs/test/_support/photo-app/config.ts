import { SqbModuleOptions } from '../../../src/sqb.interface.js';

export const dbConfig: SqbModuleOptions = {
  token: 'db1',
  useValue: {
    dialect: 'postgres',
    password: 'postgres',
  },
};
