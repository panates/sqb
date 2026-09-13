import { JoinType, SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import type { SerializeContext } from '../../serialize-context.js';
import { isRaw, isSelect, isTableName } from '../../type-guards.js';
import { And } from '../operators/and.js';
import type { LogicalOperator } from '../operators/logical-operator.js';
import type { Select } from '../select.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/**
 * A `JOIN` clause. Rather than constructing this directly with a
 * {@link JoinType}, prefer one of the fixed-type subclasses -
 * {@link InnerJoin}, {@link LeftJoin}, {@link LeftOuterJoin},
 * {@link RightJoin}, {@link RightOuterJoin}, {@link OuterJoin},
 * {@link FullOuterJoin}, {@link CrossJoin}.
 */
class JoinClass extends SqlElement {
  _joinType!: JoinType;
  _table!: TableName | Select | Raw;
  _conditions: LogicalOperator = new And();

  get _type(): SerializationType {
    return SerializationType.JOIN;
  }

  /**
   * Adds `ON` conditions, combined with the existing conditions (and each
   * other) using `AND`.
   */
  on(...conditions: SqlElement[]): this {
    this._conditions.add(...conditions);
    return this;
  }

  /**
   * Serializes as `<join type> join <table> [on <conditions>]`. A sub-select
   * join target requires an alias (set via `.as(...)`).
   */
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

  /** Serializes the `ON` clause, or an empty string if no conditions were added. */
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

/**
 * Creates a `JOIN` clause of an arbitrary {@link JoinType}. Callable with or
 * without `new`. Prefer a fixed-type subclass such as {@link InnerJoin} or
 * {@link LeftJoin} unless the join type is only known dynamically.
 *
 * @param joinType - The kind of join to serialize.
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const Join = function (
  this: Join,
  joinType: JoinType,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof Join)) return new Join(joinType, table);
  SqlElement.call(this);
  // noinspection SuspiciousTypeOfGuard
  if (!(
    isSelect(table) ||
    isRaw(table) ||
    isTableName(table) ||
    typeof table === 'string'
  )) {
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
