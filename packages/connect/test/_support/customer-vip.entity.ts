import {
  BaseEntity,
  Column,
  DataType,
  Entity,
  Link,
  PrimaryKey,
} from '@sqb/connect';
import type { Customer } from './customer.entity.js';

@Entity('customer_vip_details')
export class CustomerVip extends BaseEntity {
  @PrimaryKey()
  @Column({ fieldName: 'customer_id' })
  declare customerId?: number;

  @Column()
  declare notes?: string;

  @Column({ dataType: DataType.SMALLINT })
  declare rank?: number;

  @(Link({ exclusive: true }).toOne(
    async () => (await import('./customer.entity.js')).Customer,
  ))
  declare readonly customer?: Customer;
}
