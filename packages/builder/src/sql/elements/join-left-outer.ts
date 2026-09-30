import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/** A `LEFT OUTER JOIN` clause. Construct via the exported {@link LeftOuterJoin} factory rather than this class directly. */
class LeftOuterJoinClass extends Join {}

interface LeftOuterJoinCtor {
  new (table: string | TableName | Select | Raw): LeftOuterJoin;
  (table: string | TableName | Select | Raw): LeftOuterJoin;
  prototype: LeftOuterJoin;
}

/**
 * Creates a `LEFT OUTER JOIN` clause. Callable with or without `new`.
 *
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const LeftOuterJoin = function (
  this: LeftOuterJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof LeftOuterJoin)) return new LeftOuterJoin(table);
  Join.call(this, JoinType.LEFT_OUTER, table);
} as LeftOuterJoinCtor;

LeftOuterJoin.prototype = LeftOuterJoinClass.prototype;
LeftOuterJoin.prototype.constructor = LeftOuterJoin;

export interface LeftOuterJoin extends LeftOuterJoinClass {}
