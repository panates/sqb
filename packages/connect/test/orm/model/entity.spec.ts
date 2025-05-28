import { BaseEntity, Column, Entity, Link, PrimaryKey } from '@sqb/connect';

describe('Model / Entity', () => {
  it(`should @Entity() decorator attach metadata to class`, () => {
    @Entity()
    class MyEntity {}

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.name).toStrictEqual('MyEntity');
  });

  it(`should @Entity(string) decorator set tableName`, () => {
    @Entity('CustomEntity')
    class MyEntity {}

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.name).toStrictEqual('MyEntity');
    expect(meta!.tableName).toStrictEqual('CustomEntity');
  });

  it(`should @Entity(object) decorator set options`, () => {
    @Entity({
      tableName: 'CustomEntity',
      schema: 'my_schema',
      comment: 'comment',
    })
    class MyEntity {}

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.name).toStrictEqual('MyEntity');
    expect(meta!.tableName).toStrictEqual('CustomEntity');
    expect(meta!.schema).toStrictEqual('my_schema');
    expect(meta!.comment).toStrictEqual('comment');
  });

  it(`should inherit from other entity class`, () => {
    class Base {
      @Column()
      @PrimaryKey()
      declare id: number;
    }

    @Entity({ schema: 'my_schema', comment: 'comment' })
    class MyEntity extends Base {
      @Column()
      declare code: string;
    }

    const primaryIndex1 = Entity.getPrimaryIndex(Base);
    expect(primaryIndex1).toBeDefined();
    const primaryIndex2 = Entity.getPrimaryIndex(MyEntity);
    expect(primaryIndex2).toBeDefined();
    expect(primaryIndex1!.columns).toStrictEqual(primaryIndex2!.columns);
  });

  it(`should Entity.getElementNames() return all element names`, () => {
    @Entity()
    class Country {
      @Column()
      declare code: string;
    }

    @Entity()
    class BaseCustomer extends BaseEntity {
      @Column()
      declare id: string;

      @Column()
      declare name: number;

      @Link()
      declare country: Country;
    }

    @Entity()
    class Customer extends BaseCustomer {
      @Column()
      declare code: string;
    }

    expect(Entity.getFieldNames(Customer)).toStrictEqual([
      'id',
      'name',
      'country',
      'code',
    ]);
  });

  it(`should EntityDefinition.getDataColumnNames() return only data column names`, () => {
    @Entity()
    class Country {
      @Column()
      declare code: string;
    }

    @Entity()
    class BaseCustomer extends BaseEntity {
      @Column()
      declare id: string;

      @Column()
      declare name: number;

      @Link()
      declare country: Country;
    }

    @Entity()
    class Customer extends BaseCustomer {
      @Column()
      declare code: string;
    }

    expect(Entity.getColumnFieldNames(Customer)).toStrictEqual([
      'id',
      'name',
      'code',
    ]);
  });

  it(`should getInsertColumnNames() return only data column names to insert`, () => {
    @Entity()
    class Country {
      @Column()
      declare code: string;
    }

    @Entity()
    class BaseCustomer extends BaseEntity {
      @Column({ noInsert: true })
      declare id: string;

      @Column({ noUpdate: true })
      declare name: number;

      @Link()
      declare country: Country;
    }

    @Entity()
    class Customer extends BaseCustomer {
      @Column()
      declare code: string;
    }

    expect(Entity.getInsertColumnNames(Customer)).toStrictEqual([
      'name',
      'code',
    ]);
  });

  it(`should EntityDefinition.getInsertColumnNames() return only data column names to insert`, () => {
    @Entity()
    class Country {
      @Column()
      declare code: string;
    }

    @Entity()
    class BaseCustomer extends BaseEntity {
      @Column({ noInsert: true })
      declare id: string;

      @Column({ noUpdate: true })
      declare name: number;

      @Link()
      declare country: Country;
    }

    @Entity()
    class Customer extends BaseCustomer {
      @Column()
      declare code: string;
    }

    expect(Entity.getUpdateColumnNames(Customer)).toStrictEqual(['id', 'code']);
  });
});
