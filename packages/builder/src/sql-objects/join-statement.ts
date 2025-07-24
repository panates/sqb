import { JoinType, SerializationType } from '../enums.js';
import { SelectQuery } from '../query/select-query.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { isRawStatement, isSelectQuery, isTableName } from '../typeguards.js';
import { LogicalOperator } from './operators/logical-operator.js';
import { OpAnd } from './operators/op-and.js';
import { RawStatement } from './raw-statement.js';
import { TableName } from './table-name.js';

export class JoinStatement extends Serializable {
  _joinType: JoinType;
  _table: TableName | SelectQuery | RawStatement;
  _conditions: LogicalOperator = new OpAnd();

  constructor(
    joinType: JoinType,
    table: string | TableName | SelectQuery | RawStatement,
  ) {
    super();
    // noinspection SuspiciousTypeOfGuard
    if (
      !(
        isSelectQuery(table) ||
        isRawStatement(table) ||
        isTableName(table) ||
        typeof table === 'string'
      )
    ) {
      throw new TypeError(
        'Table name, select query or raw object required for Join',
      );
    }
    this._joinType = joinType;
    this._table = typeof table === 'string' ? new TableName(table) : table;
  }

  get _type(): SerializationType {
    return SerializationType.JOIN;
  }

  on(...conditions: Serializable[]): this {
    this._conditions.add(...conditions);
    return this;
  }

  _serialize(ctx: SerializeContext): string {
    const o = {
      joinType: this._joinType,
      table: this._table._serialize(ctx),
      conditions: this.__serializeConditions(ctx, this),
    };
    return ctx.serialize(this._type, o, () => {
      let out;
      switch (this._joinType) {
        case JoinType.LEFT:
          out = 'left join';
          break;
        case JoinType.LEFT_OUTER:
          out = 'left outer join';
          break;
        case JoinType.RIGHT:
          out = 'right join';
          break;
        case JoinType.RIGHT_OUTER:
          out = 'right outer join';
          break;
        case JoinType.OUTER:
          out = 'outer join';
          break;
        case JoinType.FULL_OUTER:
          out = 'full outer join';
          break;
        case JoinType.CROSS:
          out = 'cross join';
          break;
        default:
          out = 'inner join';
          break;
      }
      const lf = o.table.length > 40;
      if (isSelectQuery(this._table)) {
        const alias = (this._table as SelectQuery)._alias;
        if (!alias) throw new Error('Alias required for sub-select in Join');
        out +=
          ' (' +
          (lf ? '\n\t' : '') +
          o.table +
          (lf ? '\n\b' : '') +
          ') ' +
          alias;
      } else out += ' ' + o.table;

      if (o.conditions) out += ' ' + o.conditions;

      return out + (lf ? '\b' : '');
    });
  }

  protected __serializeConditions(ctx, join: JoinStatement) {
    if (join._conditions._items.length) {
      const s = join._conditions._serialize(ctx);
      return ctx.serialize(SerializationType.JOIN_CONDITIONS, s, () =>
        s ? 'on ' + s : '',
      );
    }
    return '';
  }
}
