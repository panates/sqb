import { Column, Embedded, Entity, EntityMetadata } from '@sqb/connect';

describe('Model / Embedded object element', () => {
  class PersonName {
    @Column()
    declare given: string;
    @Column()
    declare family: string;
  }

  it(`should define embedded element metadata`, () => {
    class MyEntity {
      @Embedded(PersonName)
      declare name: PersonName;
    }

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.name).toStrictEqual('MyEntity');
    const name = EntityMetadata.getEmbeddedField(meta!, 'name');
    expect(name).toBeDefined();
    expect(name!.type).toStrictEqual(PersonName);
  });

  it(`should define prefix and suffix`, () => {
    class MyEntity {
      @Embedded(PersonName, {
        fieldNamePrefix: 'prefix',
        fieldNameSuffix: 'suffix',
      })
      declare name: PersonName;
    }

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.name).toStrictEqual('MyEntity');
    const name = EntityMetadata.getEmbeddedField(meta!, 'name');
    expect(name).toBeDefined();
    expect(name!.type).toStrictEqual(PersonName);
    expect(name!.fieldNamePrefix).toStrictEqual('prefix');
    expect(name!.fieldNameSuffix).toStrictEqual('suffix');
  });
});
