import { DataType } from '../enums.js';
import { Serializable } from '../serializable.js';

export abstract class Expression extends Serializable {
  _dataType?: DataType;
  _isArray?: boolean;
  _isDataSet?: boolean;
}
