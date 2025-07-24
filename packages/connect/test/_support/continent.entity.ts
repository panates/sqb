import { Column, Entity, Link, PrimaryKey } from '@sqb/connect';
import type { Country } from './country.entity.js';
import type { Customer } from './customer.entity.js';

@Entity('continents')
export class Continent {
  @PrimaryKey()
  @Column()
  declare code: string;

  @Column()
  declare name: string;

  @(Link({ exclusive: true }).toMany(
    async () => (await import('./country.entity.js')).Country,
    {
      sourceKey: 'code',
      targetKey: 'continentCode',
    },
  ))
  declare countries: Country[];

  @(Link({ exclusive: true }).toMany(
    async () => (await import('./country.entity.js')).Country,
    {
      sourceKey: 'code',
      targetKey: 'continentCode',
      where: { hasMarket: true },
    },
  ))
  declare marketCountries: Country[];

  @(Link({ exclusive: true })
    .toMany(async () => (await import('./country.entity.js')).Country, {
      sourceKey: 'code',
      targetKey: 'continentCode',
    })
    .toOne(async () => (await import('./customer.entity.js')).Customer, {
      sourceKey: 'code',
      targetKey: 'countryCode',
    }))
  declare customers: Customer[];
}
