import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/** A `RIGHT OUTER JOIN` clause. Construct via the exported {@link RightOuterJoin} factory rather than this class directly. */
class RightOuterJoinClass extends Join {}

interface RightOuterJoinCtor {
  new (table: string | TableName | Select | Raw): RightOuterJoin;
  (table: string | TableName | Select | Raw): RightOuterJoin;
  prototype: RightOuterJoin;
}

/**
 * Creates a `RIGHT OUTER JOIN` clause. Callable with or without `new`.
 *
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const RightOuterJoin = function (
  this: RightOuterJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof RightOuterJoin)) return new RightOuterJoin(table);
  Join.call(this, JoinType.RIGHT_OUTER, table);
} as RightOuterJoinCtor;

RightOuterJoin.prototype = RightOuterJoinClass.prototype;
RightOuterJoin.prototype.constructor = RightOuterJoin;

export interface RightOuterJoin extends RightOuterJoinClass {}
