import { Column } from '@sqb/connect';

export class PersonName {
  @Column({ fieldName: 'given_name' })
  declare given?: string;

  @Column({ fieldName: 'family_name' })
  declare family?: string;
}
