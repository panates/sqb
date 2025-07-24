import { Column } from '@sqb/connect';

export class Address {
  @Column()
  declare city: string;

  @Column()
  declare street: string;

  @Column({ fieldName: 'zip_code' })
  declare zipCode: string;
}
