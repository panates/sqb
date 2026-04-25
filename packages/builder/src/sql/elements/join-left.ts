import { JoinType } from '../../enums.js';
import type { Select } from '../select.js';
import { Join } from './join.js';
import type { Raw } from './raw.js';
import { TableName } from './table-name.js';

class LeftJoinClass extends Join {}

interface LeftJoinCtor {
  new (table: string | TableName | Select | Raw): LeftJoin;
  (table: string | TableName | Select | Raw): LeftJoin;
  prototype: LeftJoin;
}

export const LeftJoin = function (
  this: LeftJoin,
  table: string | TableName | Select | Raw,
) {
  if (!(this instanceof LeftJoin)) return new LeftJoin(table);
  Join.call(this, JoinType.LEFT, table);
} as LeftJoinCtor;

LeftJoin.prototype = LeftJoinClass.prototype;
LeftJoin.prototype.constructor = LeftJoin;

export interface LeftJoin extends LeftJoinClass {}
