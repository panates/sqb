import { Expression } from './expression.js';

export abstract class BaseField extends Expression {
  _field = '';
  _schema?: string;
  _table?: string;
  _descending?: boolean;
}
