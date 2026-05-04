import { SqbClient } from '@sqb/connect';
import { expect } from 'expect';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';
import { Parent } from '../../_support/parent.entity.js';

describe('connect:Repository.findOne()', () => {
  let client: SqbClient;

  before(async () => {
    client = await initClient();
  });

  after(async () => {
    await client.close(0);
  });

  it('should return single instance', async () => {
    const repo = client.getRepository<Customer>(Customer);
    const row = await repo.findOne({ sort: ['id'] });
    expect(row).toBeDefined();
    expect(row!.id).toStrictEqual(1);
  });

  it('should return single instance from given offset', async () => {
    const repo = client.getRepository<Customer>(Customer);
    const row = await repo.findOne({
      sort: ['id'],
      offset: 10,
    });
    expect(row).toBeDefined();
    expect(row!.id).toStrictEqual(11);
  });

  it('should associate nested entities', async () => {
    const repo = client.getRepository<Parent>(Parent);
    const row = await repo.findOne({
      projection: ['+child.+grandchildren'],
    });
    expect(row).toStrictEqual({
      id: 1,
      name: 'Parent 1',
      child: {
        id: 1,
        name: 'Child 1',
        parentId: 1,
        grandchildren: [
          {
            id: 1,
            name: 'Grandchild 1-1',
            childId: 1,
          },
          {
            id: 2,
            name: 'Grandchild 1-2',
            childId: 1,
          },
        ],
      },
    });
  });
});
