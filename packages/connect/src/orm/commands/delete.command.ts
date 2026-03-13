import { And, Delete, LogicalOperator } from '@sqb/builder';
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
    const query = Delete(entity.tableName + ' T');
    if (args.comment) {
      if (Array.isArray(args.comment))
        args.comment.forEach(c => query.comment(c));
      else query.comment(args.comment as any);
    }
    if (args.indexHint) {
      if (Array.isArray(args.indexHint))
        args.indexHint.forEach(c => query.indexHint(c));
      else query.indexHint(args.indexHint as any);
    }

    if (args.noIndexHint) {
      if (Array.isArray(args.noIndexHint))
        args.noIndexHint.forEach(c => query.noIndexHint(c));
      else query.noIndexHint(args.noIndexHint as any);
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
