/* eslint-disable @typescript-eslint/no-unused-vars */
import { Entity, PrimaryKey } from '@sqb/connect';
import { expect } from 'expect';

describe('connect:Model / PrimaryKey', () => {
  it(`should define primary index field with string argument`, () => {
    @PrimaryKey('id')
    class MyEntity {}

    const primaryIndex = Entity.getPrimaryIndex(MyEntity);
    expect(primaryIndex).toBeDefined();
    expect(primaryIndex!.columns).toStrictEqual(['id']);
    expect(primaryIndex!.unique).toStrictEqual(true);
  });

  it(`should define primary index field with object definition`, () => {
    @PrimaryKey(['id'], { name: 'px_myentity_id' })
    class MyEntity {}

    const primaryIndex = Entity.getPrimaryIndex(MyEntity);
    expect(primaryIndex).toBeDefined();
    expect(primaryIndex!.name).toStrictEqual('px_myentity_id');
    expect(primaryIndex!.columns).toStrictEqual(['id']);
    expect(primaryIndex!.unique).toStrictEqual(true);
  });

  it(`should be used as PropertyDecorator`, () => {
    class MyEntity {
      @PrimaryKey({ name: 'px_myentity_id' })
      declare id: string;
    }

    const primaryIndex = Entity.getPrimaryIndex(MyEntity);
    expect(primaryIndex).toBeDefined();
    expect(primaryIndex!.columns).toStrictEqual(['id']);
    expect(primaryIndex!.name).toStrictEqual('px_myentity_id');
    expect(primaryIndex!.unique).toStrictEqual(true);
  });

  it(`should throw error on invalid argument`, () => {
    expect(() => {
      // @ts-ignore
      @PrimaryKey()
      class MyEntity {}
    }).toThrow('You must specify primary index column');

    expect(() => {
      // @ts-ignore
      @PrimaryKey({})
      class MyEntity {}
    }).toThrow('You must specify primary index column');
  });
});
