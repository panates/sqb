import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

class FullOuterJoinClass extends Join {}

interface FullOuterJoinCtor {
  new (table: string | TableName | Select | Raw): FullOuterJoin;
  (table: string | TableName | Select | Raw): FullOuterJoin;
  prototype: FullOuterJoin;
}

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
