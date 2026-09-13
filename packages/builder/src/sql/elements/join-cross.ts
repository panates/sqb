import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/** A `CROSS JOIN` clause. Construct via the exported {@link CrossJoin} factory rather than this class directly. */
class CrossJoinClass extends Join {}

interface CrossJoinCtor {
  new (table: string | TableName | Select | Raw): CrossJoin;
  (table: string | TableName | Select | Raw): CrossJoin;
  prototype: CrossJoin;
}

/**
 * Creates a `CROSS JOIN` clause. Callable with or without `new`.
 *
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const CrossJoin = function (
  this: CrossJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof CrossJoin)) return new CrossJoin(table);
  Join.call(this, JoinType.CROSS, table);
} as CrossJoinCtor;

CrossJoin.prototype = CrossJoinClass.prototype;
CrossJoin.prototype.constructor = CrossJoin;

export interface CrossJoin extends CrossJoinClass {}
