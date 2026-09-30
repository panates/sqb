import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/** A `RIGHT JOIN` clause. Construct via the exported {@link RightJoin} factory rather than this class directly. */
class RightJoinClass extends Join {}

interface RightJoinCtor {
  new (table: string | TableName | Select | Raw): RightJoin;
  (table: string | TableName | Select | Raw): RightJoin;
  prototype: RightJoin;
}

/**
 * Creates a `RIGHT JOIN` clause. Callable with or without `new`.
 *
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const RightJoin = function (
  this: RightJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof RightJoin)) return new RightJoin(table);
  Join.call(this, JoinType.RIGHT, table);
} as RightJoinCtor;

RightJoin.prototype = RightJoinClass.prototype;
RightJoin.prototype.constructor = RightJoin;

export interface RightJoin extends RightJoinClass {}
