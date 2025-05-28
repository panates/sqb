import { Column, Entity, Link, PrimaryKey } from '@sqb/connect';
import { Continent } from './continent.entity.js';
import type { Customer } from './customer.entity.js';

@Entity('countries')
export class Country {
  @PrimaryKey()
  @Column()
  declare code: string;

  @Column()
  declare name: string;

  @Column({ fieldName: 'phone_code' })
  declare phoneCode: string;

  @Column({ fieldName: 'continent_code' })
  declare continentCode: string;

  @Column({ fieldName: 'has_market', default: true })
  declare hasMarket: boolean;

  @Link({ exclusive: true })
  declare readonly continent: Continent;

  @(Link({ exclusive: true }).toMany(
    async () => (await import('./customer.entity.js')).Customer,
    {
      sourceKey: 'code',
      targetKey: 'countryCode',
    },
  ))
  declare readonly customers: Customer[];

  @(Link({ exclusive: true }).toMany(
    async () => (await import('./customer.entity.js')).Customer,
    {
      sourceKey: 'code',
      targetKey: 'countryCode',
      where: { vip: true },
    },
  ))
  declare readonly vipCustomers: Customer[];
}
