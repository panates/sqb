import { JoinType, SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import type { SerializeContext } from '../../serialize-context.js';
import { isRaw, isSelect, isTableName } from '../../type-guards.js';
import { And } from '../operators/and.js';
import type { LogicalOperator } from '../operators/logical-operator.js';
import type { Select } from '../select.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

class JoinClass extends SqlElement {
  _joinType!: JoinType;
  _table!: TableName | Select | Raw;
  _conditions: LogicalOperator = new And();

  get _type(): SerializationType {
    return SerializationType.JOIN;
  }

  on(...conditions: SqlElement[]): this {
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
      if (isSelect(this._table)) {
        const alias = (this._table as Select)._alias;
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

  protected __serializeConditions(ctx, join: JoinClass) {
    if (join._conditions._items.length) {
      const s = join._conditions._serialize(ctx);
      return ctx.serialize(SerializationType.JOIN_CONDITIONS, s, () =>
        s ? 'on ' + s : '',
      );
    }
    return '';
  }
}

interface JoinCtor {
  new (joinType: JoinType, table: string | TableName | Select | Raw): Join;
  (joinType: JoinType, table: string | TableName | Select | Raw): Join;
  prototype: Join;
}

export const Join = function (
  this: Join,
  joinType: JoinType,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof Join)) return new Join(joinType, table);
  SqlElement.call(this);
  // noinspection SuspiciousTypeOfGuard
  if (
    !(
      isSelect(table) ||
      isRaw(table) ||
      isTableName(table) ||
      typeof table === 'string'
    )
  ) {
    throw new TypeError(
      'Table name, select query or raw object required for Join',
    );
  }
  this._joinType = joinType;
  this._table = typeof table === 'string' ? TableName(table) : table;
  this._conditions = new And();
} as JoinCtor;

Join.prototype = JoinClass.prototype;
Join.prototype.constructor = Join;

export interface Join extends JoinClass {}
