import { And, Param, Update } from '@sqb/builder';
import type { SqbConnection } from '../../client/sqb-connection.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import type { Repository } from '../repository.class.js';
import {
  checkEnumValue,
  isColumnField,
  isEmbeddedField,
  resolveEntityForEmbeddedField,
} from '../util/orm.helper.js';
import { prepareFilter } from './command.helper.js';

export type UpdateCommandArgs = {
  entity: EntityMetadata;
  connection: SqbConnection;
  values: any;
} & Repository.UpdateManyOptions;

type UpdateCommandContext = {
  entity: EntityMetadata;
  queryParams: any;
  queryValues: any;
  queryFilter: any[];
  colCount: number;
};

export class UpdateCommand {
  // istanbul ignore next
  protected constructor() {
    throw new Error('This class is abstract');
  }

  static async execute(args: UpdateCommandArgs): Promise<number> {
    const { entity } = args;
    const tableName = entity.tableName;
    if (!tableName)
      throw new Error(
        `${entity.ctor.name} is not decorated with @Entity decorator`,
      );

    // Create a context
    const ctx: UpdateCommandContext = {
      entity,
      queryParams: {},
      queryValues: {},
      queryFilter: [],
      colCount: 0,
    };

    // Prepare
    await this._prepareParams(ctx, entity, args.values);
    if (!ctx.colCount) return 0;

    if (args.filter) await this._prepareFilter(ctx, args.filter);
    const query = Update(tableName + ' as T', ctx.queryValues).where(
      ...ctx.queryFilter,
    );
    const qr = await args.connection.execute(query, {
      params: args.params ? [...args.params, ctx.queryParams] : ctx.queryParams,
      objectRows: false,
      cursor: false,
    });
    return qr.rowsAffected || 0;
  }

  protected static async _prepareFilter(
    ctx: UpdateCommandContext,
    filter: any,
  ) {
    if (filter) {
      const where = And();
      await prepareFilter(ctx.entity, filter, where);
      ctx.queryFilter.push(...where._items);
    }
  }

  protected static async _prepareParams(
    ctx: UpdateCommandContext,
    entity: EntityMetadata,
    values: any,
    prefix?: string,
    suffix?: string,
  ) {
    let v;
    prefix = prefix || '';
    suffix = suffix || '';
    for (const col of Object.values(entity.fields)) {
      v = values[col.name];
      if (v === undefined) continue;
      if (isColumnField(col)) {
        if (col.noUpdate) continue;
        if (typeof col.serialize === 'function') v = col.serialize(v, col.name);
        if (v === null && col.notNull)
          throw new Error(
            `${entity.name}.${col.name} is required and can't be null`,
          );
        if (v === undefined) continue;
        checkEnumValue(col, v);
        const fieldName = prefix + col.fieldName + suffix;
        const k = ('I$_' + fieldName).substring(0, 30);
        ctx.queryValues[fieldName] = Param({
          name: k,
          dataType: col.dataType,
          isArray: col.isArray,
        });
        ctx.queryParams[k] = v;
        ctx.colCount++;
      } else if (v != null && isEmbeddedField(col)) {
        const type = await resolveEntityForEmbeddedField(col);
        await this._prepareParams(
          ctx,
          type,
          v,
          col.fieldNamePrefix,
          col.fieldNameSuffix,
        );
      }
    }
  }
}
