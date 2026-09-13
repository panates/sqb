import { DataType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';

/**
 * Abstract base for every `[schema.][table.]field` style column reference
 * ({@link Field}, {@link GroupColumn}, {@link OrderColumn},
 * {@link ReturningColumn}). Holds the parsed schema/table/field-name parts
 * shared by all of them.
 */
export interface BaseField extends SqlElement {
  /** The column's portable data type, if known (used by {@link Field}). */
  _dataType?: DataType;
  /** Whether the column value is (or should be treated as) an array (used by {@link Field}). */
  _isArray?: boolean;
  _isDataSet?: boolean;
  /** The bare field/column name (or `*`), without schema/table qualification. */
  _field: string;
  /** The schema name, if the reference was qualified with one. */
  _schema?: string;
  /** The table name, if the reference was qualified with one. */
  _table?: string;
  /** Whether this column sorts descending (used by {@link OrderColumn}). */
  _descending?: boolean;
}

interface BaseFieldCtor {
  new (): BaseField;
  (): BaseField;
  prototype: BaseField;
}

/**
 * Abstract constructor for column-reference elements. Not meant to be
 * constructed directly - use {@link Field}, {@link GroupColumn},
 * {@link OrderColumn}, or {@link ReturningColumn}.
 *
 * @throws {TypeError} If instantiated directly rather than through a subclass.
 */
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
