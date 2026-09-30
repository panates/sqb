import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/** A `FULL OUTER JOIN` clause. Construct via the exported {@link FullOuterJoin} factory rather than this class directly. */
class FullOuterJoinClass extends Join {}

interface FullOuterJoinCtor {
  new (table: string | TableName | Select | Raw): FullOuterJoin;
  (table: string | TableName | Select | Raw): FullOuterJoin;
  prototype: FullOuterJoin;
}

/**
 * Creates a `FULL OUTER JOIN` clause. Callable with or without `new`.
 *
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const FullOuterJoin = function (
  this: FullOuterJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof FullOuterJoin)) return new FullOuterJoin(table);
  Join.call(this, JoinType.FULL_OUTER, table);
} as FullOuterJoinCtor;

FullOuterJoin.prototype = FullOuterJoinClass.prototype;
FullOuterJoin.prototype.constructor = FullOuterJoin;

export interface FullOuterJoin extends FullOuterJoinClass {}
