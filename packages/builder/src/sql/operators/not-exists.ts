import { OperatorType } from '../../enums.js';
import type { Raw } from '../elements/index.js';
import type { Select } from '../select.js';
import { Exists } from './exists.js';

class NotExistsClass extends Exists {}

interface NotExistsCtor {
  new (query: Select | Raw): NotExists;
  (query: Select | Raw): NotExists;
  prototype: NotExists;
}

export const NotExists = function (this: NotExists, query: Select | Raw) {
  if (!(this instanceof NotExists)) return new NotExists(query);
  Exists.call(this, query);
  this._operatorType = OperatorType.notExists;
  this._symbol = 'not exists';
} as NotExistsCtor;

NotExists.prototype = NotExistsClass.prototype;
NotExists.prototype.constructor = NotExists;

export interface NotExists extends NotExistsClass {}
