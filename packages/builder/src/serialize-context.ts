import { SerializationType } from './enums.js';
import { SerializerRegistry } from './extensions.js';
import { Serializable } from './serializable.js';
import { isLogicalOperator, isQuery, isSerializable } from './typeguards.js';
import {
  DefaultSerializeFunction,
  GenerateOptions,
  ParamOptions,
} from './types.js';

export class SerializeContext implements GenerateOptions {
  readonly reservedWords = [
    'schema',
    'table',
    'field',
    'index',
    'foreign',
    'key',
    'select',
    'insert',
    'update',
    'delete',
    'with',
    'merge',
    'join',
    'inner',
    'outer',
    'left',
    'right',
    'full',
    'from',
    'where',
    'order',
    'by',
    'group',
    'having',
    'acs',
    'ascending',
    'dsc',
    'descending',
    'distinct',
    'and',
    'or',
    'not',
    'between',
    'null',
    'like',
    'ilike',
    'count',
    'sum',
    'average',
    'avg',
    'cascade',
    'authorization',
    'create',
    'add',
    'drop',
    'alter',
    'index',
    'private',
    'sequence',
    'default',
    'constraint',
    'references',
    'primary',
    'foreign',
    'user',
    'password',
  ];

  dialect?: string;
  prettyPrint?: boolean;
  params?: Record<string, any>;
  dialectVersion?: string;
  strictParams?: boolean;
  serializeHooks?: Function[];
  paramOptions?: Record<string, ParamOptions> | ParamOptions[];
  preparedParams?: Record<string, any> | any[];
  returningFields?: { field: string; alias?: string }[];
  strictParamGenId?: number;

  constructor(opts?: GenerateOptions) {
    if (opts) Object.assign(this, opts);
  }

  /**
   * Performs a fallback mechanism, tries hook functions, extensions than default function to serialize
   */
  serialize(type: string, o: any, fallback: DefaultSerializeFunction): string {
    if (this.serializeHooks) {
      for (const hook of this.serializeHooks) {
        const s = hook(this, type, o, fallback);
        if (s != null) return s;
      }
    }
    for (const ext of SerializerRegistry.items()) {
      if (ext.dialect === this.dialect && ext.serialize) {
        const s = ext.serialize(this, type, o, fallback);
        if (s != null) return s;
      }
    }
    return fallback(this, o);
  }

  /**
   * Serializes object
   */
  anyToSQL(v): string {
    if (v == null) return 'null';
    if (Array.isArray(v)) {
      const vv = v.map(x => this.anyToSQL(x));
      return (
        this.serialize(SerializationType.ARRAY, vv, () => '(' + vv.join(',')) +
        ')'
      );
    }
    if (typeof v === 'object') {
      if (isSerializable(v)) {
        const s = v._serialize(this);
        return s
          ? isQuery(v) || isLogicalOperator(v)
            ? '(' + s + ')'
            : s
          : /* istanbul ignore next */ '';
      }
      if (v instanceof Date) {
        return this.serialize(SerializationType.DATE_VALUE, v, () =>
          this.dateToSQL(v),
        );
      }
      return this.stringToSQL(JSON.stringify(v));
    }
    if (typeof v === 'string') {
      return this.serialize(SerializationType.STRING_VALUE, v, () =>
        this.stringToSQL(v),
      );
    }
    if (typeof v === 'boolean') {
      return this.serialize(SerializationType.BOOLEAN_VALUE, v, () =>
        this.booleanToSQL(v),
      );
    }
    if (typeof v === 'number') {
      return this.serialize(SerializationType.NUMBER_VALUE, v, () =>
        this.numberToSQL(v),
      );
    }
    if (v instanceof Serializable) return v._serialize(this);
    return v;
  }

  /**
   *
   */
  stringToSQL(val: string): string {
    return "'" + String(val).replace(/'/g, "''") + "'";
  }

  /**
   *
   */
  booleanToSQL(val: any): string {
    return val ? 'true' : 'false';
  }

  /**
   *
   */
  numberToSQL(val: any): string {
    return '' + val;
  }

  /**
   *
   */
  dateToSQL(date: Date): string {
    const d = date.getUTCDate();
    const m = date.getUTCMonth() + 1;
    const y = date.getUTCFullYear();
    const h = date.getUTCHours();
    const n = date.getUTCMinutes();
    const s = date.getUTCSeconds();
    let str: string =
      y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
    /* istanbul ignore else */
    if (h + n + s)
      str +=
        ' ' +
        (h <= 9 ? '0' + h : h) +
        ':' +
        (n <= 9 ? '0' + n : n) +
        ':' +
        (s <= 9 ? '0' + s : s);
    return "'" + str + "'";
  }

  /**
   * Check if a string value is a reserved word
   */
  isReservedWord(s: string | undefined | null): boolean {
    if (!s) return false;
    if (this.reservedWords.includes(s.toLowerCase())) return true;
    for (const ext of SerializerRegistry.items()) {
      if (ext.dialect === this.dialect && ext.isReservedWord) {
        if (ext.isReservedWord(this, s)) return true;
      }
    }
    return false;
  }

  escapeReserved(s: string | undefined | null): string {
    if (!s) return '';
    if (this.isReservedWord(s)) return '"' + s + '"';
    return s;
  }
}
