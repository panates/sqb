import { DataType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';

export interface BaseField extends SqlElement {
  _dataType?: DataType;
  _isArray?: boolean;
  _isDataSet?: boolean;
  _field: string;
  _schema?: string;
  _table?: string;
  _descending?: boolean;
}

interface BaseFieldCtor {
  new (): BaseField;
  (): BaseField;
  prototype: BaseField;
}

export const BaseField = function (this: BaseField) {
  if (!(this instanceof BaseField)) return new BaseField();
  if (this.constructor === BaseField) {
    throw new TypeError('BaseField is abstract and cannot be instantiated');
  }
  SqlElement.call(this);
  this._field = '';
} as BaseFieldCtor;

BaseField.prototype = Object.create(SqlElement.prototype);
BaseField.prototype.constructor = BaseField;
