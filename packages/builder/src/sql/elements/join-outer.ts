import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/** An `OUTER JOIN` clause. Construct via the exported {@link OuterJoin} factory rather than this class directly. */
class OuterJoinClass extends Join {}

interface OuterJoinCtor {
  new (table: string | TableName | Select | Raw): OuterJoin;
  (table: string | TableName | Select | Raw): OuterJoin;
  prototype: OuterJoin;
}

/**
 * Creates an `OUTER JOIN` clause. Callable with or without `new`.
 *
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const OuterJoin = function (
  this: OuterJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof OuterJoin)) return new OuterJoin(table);
  Join.call(this, JoinType.OUTER, table);
} as OuterJoinCtor;

OuterJoin.prototype = OuterJoinClass.prototype;
OuterJoin.prototype.constructor = OuterJoin;

export interface OuterJoin extends OuterJoinClass {}
