/* eslint-disable @typescript-eslint/no-unused-vars */
import { Entity, Index } from '@sqb/connect';

describe('Model / Index', () => {
  it(`should define index field with string argument`, () => {
    @Index('id')
    class MyEntity {}

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.indexes.length).toStrictEqual(1);
    expect(meta!.indexes[0].columns).toStrictEqual(['id']);
  });

  it(`should define index field with object definition`, () => {
    @Index(['name'], { name: 'idx_myentity_name', unique: true })
    class MyEntity {}

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.indexes.length).toStrictEqual(1);
    expect(meta!.indexes[0].name).toStrictEqual('idx_myentity_name');
    expect(meta!.indexes[0].columns).toStrictEqual(['name']);
    expect(meta!.indexes[0].unique).toStrictEqual(true);
  });

  it(`should be used as PropertyDecorator`, () => {
    class MyEntity {
      @Index({ unique: true })
      declare id: string;
    }

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.indexes.length).toStrictEqual(1);
    expect(meta!.indexes[0].columns).toStrictEqual(['id']);
    expect(meta!.indexes[0].unique).toStrictEqual(true);
  });

  it(`should throw error on invalid argument`, () => {
    expect(() => {
      // @ts-ignore
      @Index()
      class MyEntity {}
    }).toThrow('You must specify index column');

    expect(() => {
      // @ts-ignore
      @Index({})
      class MyEntity {}
    }).toThrow('You must specify index column');
  });
});
