import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

class OuterJoinClass extends Join {}

interface OuterJoinCtor {
  new (table: string | TableName | Select | Raw): OuterJoin;
  (table: string | TableName | Select | Raw): OuterJoin;
  prototype: OuterJoin;
}

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
