import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

class RightJoinClass extends Join {}

interface RightJoinCtor {
  new (table: string | TableName | Select | Raw): RightJoin;
  (table: string | TableName | Select | Raw): RightJoin;
  prototype: RightJoin;
}

export const RightJoin = function (
  this: RightJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof RightJoin)) return new RightJoin(table);
  Join.call(this, JoinType.RIGHT, table);
} as RightJoinCtor;

RightJoin.prototype = RightJoinClass.prototype;
RightJoin.prototype.constructor = RightJoin;

export interface RightJoin extends RightJoinClass {}
