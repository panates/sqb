import { expect } from 'expect';
import {
  Select,
  SerializationType,
  SerializerExtension,
  SerializerRegistry,
} from '../src/index.js';

describe('builder:Serializer Extensions', () => {
  it('should register serialization extension', () => {
    const oldLen = SerializerRegistry.size;
    const extension1: SerializerExtension = {
      dialect: 'any-dialect',
      serialize: () => '',
    };
    const extension2: SerializerExtension = {
      dialect: 'any-dialect',
      isReservedWord: () => true,
    };
    SerializerRegistry.register(extension1, extension2);
    expect(SerializerRegistry.size).toStrictEqual(oldLen + 2);
    expect(SerializerRegistry.get(oldLen)).toStrictEqual(extension1);
    expect(SerializerRegistry.get(oldLen + 1)).toStrictEqual(extension2);
    SerializerRegistry.unRegister(extension1, extension2);
    SerializerRegistry.unRegister();
  });

  it('should an extension hook serialization process', () => {
    const ext = {
      dialect: 'any-dialect',
      serialize: (ctx, type, obj) => {
        if (type === SerializationType.TABLE_NAME)
          return obj.table.toUpperCase() + ' ' + obj.alias.toUpperCase();
      },
    };
    SerializerRegistry.register(ext);
    const query = Select('*').addColumn().from('table1 t1');
    const result = query.generate({ dialect: 'any-dialect' });
    expect(result.sql).toStrictEqual('select * from TABLE1 T1');
    SerializerRegistry.unRegister(ext);
  });

  it('should an extension can hook determining reserved words process', () => {
    const ext = {
      dialect: 'any-dialect',
      isReservedWord: (ctx, s) => s === 'hello',
    };
    SerializerRegistry.register(ext);
    const query = Select('hello').addColumn().from('table1');
    const result = query.generate({ dialect: 'any-dialect' });
    expect(result.sql).toStrictEqual('select "hello" from table1');
    SerializerRegistry.unRegister(ext);
  });
});
