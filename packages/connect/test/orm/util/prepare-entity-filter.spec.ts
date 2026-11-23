import { DataType, Eq, Select } from '@sqb/builder';
import {
  Column,
  Entity,
  Link,
  prepareEntityFilter,
  PrimaryKey,
} from '@sqb/connect';
import { expect } from 'expect';

@Entity('countries')
class Country {
  @PrimaryKey()
  @Column()
  declare code: string;

  @Column({ fieldName: 'is_active' })
  declare active: boolean;

  @Column()
  declare name: string;
}

@Entity('telecoms')
class Telecom {
  @PrimaryKey()
  @Column({ dataType: DataType.BIGINT })
  declare id: number;

  @Column({ fieldName: 'patient_id', dataType: DataType.BIGINT })
  declare patientId: number;

  @Column({ fieldName: 'country_code' })
  declare countryCode: string;

  @Column({ fieldName: 'tc_kind' })
  declare kind: string;

  @Column({ fieldName: 'tc_value' })
  declare value: string;
}

@Entity('patients')
class Patient {
  @PrimaryKey()
  @Column({ dataType: DataType.BIGINT })
  declare id: number;

  @(Link().toMany(() => Telecom, {
    sourceKey: 'id',
    targetKey: 'patientId',
    where: Eq('kind', 'phone'),
  }))
  declare phones: Telecom[];

  @(Link()
    .toMany(() => Telecom, {
      sourceKey: 'id',
      targetKey: 'patientId',
      where: Eq('kind', 'phone'),
    })
    .toOne(() => Country, {
      sourceKey: 'countryCode',
      targetKey: 'code',
      where: Eq('active', true),
    }))
  declare phoneCountries: Country[];
}

describe('connect:prepareEntityFilter()', () => {
  it('should qualify column names with the given table alias', async () => {
    const op = await prepareEntityFilter(Telecom, Eq('kind', 'phone'), 't_k0');
    const query = Select().from('telecoms t_k0').where(op);
    expect(query.generate().sql).toStrictEqual(
      `select * from telecoms t_k0 where (t_k0.tc_kind = 'phone')`,
    );
  });

  it('should default the table alias to "T"', async () => {
    const op = await prepareEntityFilter(Telecom, { kind: 'phone' });
    const query = Select().from('telecoms T').where(op);
    expect(query.generate().sql).toStrictEqual(
      `select * from telecoms T where (T.tc_kind = 'phone')`,
    );
  });

  it('should put the conditions of a link inside its EXISTS sub-query', async () => {
    const op = await prepareEntityFilter(Patient, Eq('phones.value', '555'));
    const query = Select().from('patients T').where(op);
    expect(query.generate().sql).toStrictEqual(
      `select * from patients T where (exists (select 1 from telecoms K` +
        ` where K.patient_id = T.id and K.tc_kind = 'phone' and K.tc_value = '555'))`,
    );
  });

  it('should keep the conditions of a link inside its EXISTS sub-query in an "or" filter', async () => {
    const { Or } = await import('@sqb/builder');
    const op = await prepareEntityFilter(
      Patient,
      Or(Eq('phones.value', '555'), Eq('id', 1)),
    );
    const sql = Select().from('patients T').where(op).generate().sql;
    expect(sql).toContain(
      `exists (select 1 from telecoms K where K.patient_id = T.id and K.tc_kind = 'phone'`,
    );
    expect(sql).not.toMatch(/\)\) or K\.|\) and K\./);
  });

  it('should add the conditions of every hop of a multi-hop link', async () => {
    const op = await prepareEntityFilter(
      Patient,
      Eq('phoneCountries.name', 'TR'),
    );
    const query = Select().from('patients T').where(op);
    expect(query.generate().sql).toStrictEqual(
      `select * from patients T where (exists (select 1 from telecoms K` +
        ` inner join countries J1 on J1.code = K.country_code and J1.is_active = true` +
        ` where K.patient_id = T.id and K.tc_kind = 'phone' and J1.name = 'TR'))`,
    );
  });
});
