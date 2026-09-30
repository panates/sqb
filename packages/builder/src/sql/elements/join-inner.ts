import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

/** An `INNER JOIN` clause. Construct via the exported {@link InnerJoin} factory rather than this class directly. */
class InnerJoinClass extends Join {}

interface InnerJoinCtor {
  new (table: string | TableName | Select | Raw): InnerJoin;
  (table: string | TableName | Select | Raw): InnerJoin;
  prototype: InnerJoin;
}

/**
 * Creates an `INNER JOIN` clause. Callable with or without `new`.
 *
 * @param table - The joined table name, {@link TableName}, sub-`Select` (requires an alias via `.as(...)`), or {@link Raw}.
 * @throws {TypeError} If `table` isn't a string, `TableName`, `Select`, or `Raw`.
 */
export const InnerJoin = function (
  this: InnerJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof InnerJoin)) return new InnerJoin(table);
  Join.call(this, JoinType.INNER, table);
} as InnerJoinCtor;

InnerJoin.prototype = InnerJoinClass.prototype;
InnerJoin.prototype.constructor = InnerJoin;

export interface InnerJoin extends InnerJoinClass {}
