import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

class InnerJoinClass extends Join {}

interface InnerJoinCtor {
  new (table: string | TableName | Select | Raw): InnerJoin;
  (table: string | TableName | Select | Raw): InnerJoin;
  prototype: InnerJoin;
}

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
