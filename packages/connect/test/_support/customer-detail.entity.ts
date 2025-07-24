import { BaseEntity, Column, Entity, Link, PrimaryKey } from '@sqb/connect';
import type { Customer } from './customer.entity.js';

@Entity('customer_details')
export class CustomerDetail extends BaseEntity {
  @PrimaryKey()
  @Column({ fieldName: 'customer_id' })
  declare customerId?: number;

  @Column()
  declare notes?: string;

  @Column()
  declare alerts?: string;

  @(Link({ exclusive: true }).toOne(
    async () => (await import('./customer.entity.js')).Customer,
  ))
  declare readonly customer?: Customer;
}
