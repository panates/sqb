import '../../_support/env';
import assert from 'assert';
import {initClient} from '../../_support/init-client';
import {Customer} from '../../_support/customer.entity';

describe('findOne()', function () {

    const client = initClient();

    it('should return single instance', async function () {
        const repo = client().getRepository<Customer>(Customer);
        const row = await repo.findOne({sort: ['id']});
        assert.ok(row);
        assert.strictEqual(row.id, 1);
    });

    it('should return single instance from given offset', async function () {
        const repo = client().getRepository<Customer>(Customer);
        const row = await repo.findOne({
            sort: ['id'],
            offset: 10
        });
        assert.ok(row);
        assert.strictEqual(row.id, 11);
    });

});