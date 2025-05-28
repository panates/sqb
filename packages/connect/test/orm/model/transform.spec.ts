import { Entity, EntityMetadata, Parse, Serialize } from '@sqb/connect';

describe('Model / Parse', () => {
  it(`should @Parse() decorator set "parse" property of metadata`, () => {
    const fn = v => '>' + v;

    class MyEntity {
      @Parse(fn)
      declare id: string;
    }

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.name).toStrictEqual('MyEntity');
    const idColumn = EntityMetadata.getColumnField(meta!, 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn!.parse).toStrictEqual(fn);
  });
});

describe('Model / Serialize', () => {
  it(`should @Serialize() decorator set "parse" property of metadata`, () => {
    const fn = v => '>' + v;

    class MyEntity {
      @Serialize(fn)
      declare id: string;
    }

    const meta = Entity.getMetadata(MyEntity);
    expect(meta).toBeDefined();
    expect(meta!.name).toStrictEqual('MyEntity');
    const idColumn = EntityMetadata.getColumnField(meta!, 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn!.serialize).toStrictEqual(fn);
  });
});
