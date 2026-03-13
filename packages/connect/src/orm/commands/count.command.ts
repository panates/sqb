import { And, Count, LogicalOperator, Select, TableName } from '@sqb/builder';
import type { SqbConnection } from '../../client/sqb-connection.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import type { Repository } from '../repository.class.js';
import { prepareFilter } from './command.helper.js';

export type CountCommandArgs = {
  entity: EntityMetadata;
  connection: SqbConnection;
} & Repository.CountOptions;

export class CountCommand {
  // istanbul ignore next
  protected constructor() {
    throw new Error('This class is abstract');
  }

  static async execute(args: CountCommandArgs): Promise<number> {
    const { connection, entity, filter, params } = args;
    let where: LogicalOperator | undefined;
    if (filter) {
      where = And();
      await prepareFilter(entity, filter, where, 'T');
    }
    const query = Select(Count()).from(
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
    if (where) query.where(where);
    // Execute query
    const resp = await connection.execute(query, {
      params,
      objectRows: false,
      cursor: false,
    });
    return (resp && resp.rows && resp.rows[0][0]) || 0;
  }
}
