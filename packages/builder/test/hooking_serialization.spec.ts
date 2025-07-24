import { expect } from 'expect';
import { Eq, Select, SerializationType } from '../src/index.js';

describe('builder:Hooking serialization', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should hook serialization', () => {
    const query = Select()
      .from('table1')
      .on('serialize', (ctx, type) => {
        if (type === 'table_name') return 'table2';
      });
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from table2');
  });

  it('should continue serialization with modified options', () => {
    const query = Select()
      .from('table1')
      .where(Eq('id', 1))
      .on('serialize', (ctx, type, o) => {
        if (type === SerializationType.COMPARISON_EXPRESSION)
          o.left.expression = 'new_id';
      });
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from table1 where new_id = 1');
  });
});
