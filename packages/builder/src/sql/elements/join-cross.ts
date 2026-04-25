import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

class CrossJoinClass extends Join {}

interface CrossJoinCtor {
  new (table: string | TableName | Select | Raw): CrossJoin;
  (table: string | TableName | Select | Raw): CrossJoin;
  prototype: CrossJoin;
}

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
