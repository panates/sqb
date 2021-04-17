import {And, Delete, LogicalOperator} from '@sqb/builder';
import {QueryExecutor} from '../../client/types';
import {EntityMeta} from '../metadata/entity-meta';
import {Repository} from '../repository';
import {prepareFilter} from '../util/prepare-filter';

export type DestroyCommandArgs = {
    entity: EntityMeta;
    connection: QueryExecutor;
} & Repository.DestroyAllOptions;

export class DestroyCommand {

    // istanbul ignore next
    protected constructor() {
        throw new Error('This class is abstract');
    }

    static async execute(args: DestroyCommandArgs): Promise<number> {
        const {connection, entity, filter, params} = args;

        let where: LogicalOperator | undefined;
        if (filter) {
            where = And();
            await prepareFilter(entity, filter, where);
        }
        const query = Delete(entity.tableName + ' T');
        if (where)
            query.where(...where._items);
        // Execute query
        const resp = await connection.execute(query, {
            params,
            objectRows: false,
            cursor: false,
        });
        return (resp && resp.rowsAffected) || 0;
    }
}
