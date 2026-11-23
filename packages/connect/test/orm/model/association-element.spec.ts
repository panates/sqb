/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import { Column, Entity, EntityMetadata, Link, PrimaryKey } from '@sqb/connect';
import { expect } from 'expect';
import { isAssociationField } from '../../../src/orm/util/orm.helper.js';

@Entity()
class Country {
  @PrimaryKey()
  @Column()
  declare code: string;

  @Column()
  declare name: string;
}

class BaseCustomer {
  @PrimaryKey()
  @Column()
  declare id: number;

  @Column()
  declare countryCode: string;
}

describe('connect:Model / Link field', () => {
  it(`should @Link() decorator define association element`, () => {
    class Customer extends BaseCustomer {
      @(Link().toOne(Country))
      declare country: Country;

      @(Link().toMany(Country))
      declare country2: Country[];
    }

    const meta = Entity.getMetadata(Customer);
    expect(meta).toBeDefined();
    let col = EntityMetadata.getAssociationField(meta!, 'country');
    expect(isAssociationField(col)).toBeTruthy();
    expect(col!.name).toStrictEqual('country');
    expect(col!.association.source).toStrictEqual(Customer);
    expect(col!.association.target).toStrictEqual(Country);
    expect(col!.association.returnsMany()).toStrictEqual(false);
    col = EntityMetadata.getAssociationField(meta!, 'country2');
    expect(isAssociationField(col)).toBeTruthy();
    expect(col!.name).toStrictEqual('country2');
    expect(col!.association.source).toStrictEqual(Customer);
    expect(col!.association.target).toStrictEqual(Country);
    expect(col!.association.returnsMany()).toStrictEqual(true);
  });

  it(`should throw if type is an array an linked entity is not defined`, async () => {
    expect(() => {
      class Customer {
        @Link()
        declare countries: Country[];
      }
    }).toThrow('type information while');
  });

  it(`should throw if reflection type is not an entity`, async () => {
    expect(() => {
      class Customer {
        @Link()
        declare countries: String;
      }
    }).toThrow('No entity metadata found');
  });

  it(`should throw if association returns many and property type is not an array`, async () => {
    expect(() => {
      class Customer {
        @(Link().toMany(Country))
        declare countries: Country;
      }
    }).toThrow('Link returns single instance');
  });

  it(`should throw if association returns single and property type is an array`, async () => {
    expect(() => {
      class Customer {
        @(Link().toOne(Country))
        declare countries: Country[];
      }
    }).toThrow('Link returns array of instances');
  });

  describe('without decorator metadata', () => {
    // Applying the decorator by hand emits no design:type metadata, as a
    // build with emitDecoratorMetadata off does.
    it(`should accept .toMany() on a property with no reflected type`, () => {
      class Customer extends BaseCustomer {
        declare countries: Country[];
      }
      Link().toMany(() => Country, {
        sourceKey: 'countryCode',
        targetKey: 'code',
      })(Customer.prototype, 'countries');
      const col = EntityMetadata.getAssociationField(
        Entity.getMetadata(Customer)!,
        'countries',
      );
      expect(isAssociationField(col)).toBeTruthy();
      expect(col!.association.returnsMany()).toStrictEqual(true);
    });

    it(`should accept .toOne() on a property with no reflected type`, () => {
      class Customer extends BaseCustomer {
        declare country: Country;
      }
      Link().toOne(() => Country)(Customer.prototype, 'country');
      const col = EntityMetadata.getAssociationField(
        Entity.getMetadata(Customer)!,
        'country',
      );
      expect(col!.association.returnsMany()).toStrictEqual(false);
    });

    it(`should throw if neither .toOne() nor .toMany() is called`, () => {
      class Customer extends BaseCustomer {
        declare country: Country;
      }
      expect(() => Link()(Customer.prototype, 'country')).toThrow(
        `Can't get type information of "country"`,
      );
    });
  });
});
