import { And, Delete, LogicalOperator, TableName } from '@sqb/builder';
import type { SqbConnection } from '../../client/sqb-connection.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import type { Repository } from '../repository.class.js';
import { prepareFilter } from './command.helper.js';

export type DestroyCommandArgs = {
  entity: EntityMetadata;
  connection: SqbConnection;
} & Repository.DeleteManyOptions;

export class DeleteCommand {
  // istanbul ignore next
  protected constructor() {
    throw new Error('This class is abstract');
  }

  static async execute(args: DestroyCommandArgs): Promise<number> {
    const { connection, entity, filter, params } = args;

    let where: LogicalOperator | undefined;
    if (filter) {
      where = And();
      await prepareFilter(entity, filter, where);
    }
    const query = Delete(
      TableName({
        table: entity.tableName!,
        alias: 'T',
        optimizerHint: args.optimizerHint,
      }),
    );
    if (args.comment) {
      if (Array.isArray(args.comment))
        args.comment.forEach(c => query.comment(c));
      else query.comment(args.comment as any);
    }

    if (where) query.where(...where._items);
    // Execute query
    const resp = await connection.execute(query, {
      params,
      objectRows: false,
      cursor: false,
    });
    return (resp && resp.rowsAffected) || 0;
  }
}
