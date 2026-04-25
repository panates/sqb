import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

class LeftOuterJoinClass extends Join {}

interface LeftOuterJoinCtor {
  new (table: string | TableName | Select | Raw): LeftOuterJoin;
  (table: string | TableName | Select | Raw): LeftOuterJoin;
  prototype: LeftOuterJoin;
}

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
