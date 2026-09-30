import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/** A `LEFT JOIN` clause. Construct via the exported {@link LeftJoin} factory rather than this class directly. */
class LeftJoinClass extends Join {}

interface LeftJoinCtor {
  new (table: string | TableName | Select | Raw): LeftJoin;
  (table: string | TableName | Select | Raw): LeftJoin;
  prototype: LeftJoin;
}

/**
 * Creates a `LEFT JOIN` clause. Callable with or without `new`.
 *
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const LeftJoin = function (
  this: LeftJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof LeftJoin)) return new LeftJoin(table);
  Join.call(this, JoinType.LEFT, table);
} as LeftJoinCtor;

LeftJoin.prototype = LeftJoinClass.prototype;
LeftJoin.prototype.constructor = LeftJoin;

export interface LeftJoin extends LeftJoinClass {}
