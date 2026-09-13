import type { FieldInfo } from './types.js';

/**
 * An ordered, case-insensitively-keyed collection of a result set's
 * {@link FieldInfo} entries - exposed as `QueryResult.fields` and
 * `Cursor.fields`. Lookups by name (`get`) ignore case, matching how SQL
 * identifiers are typically compared.
 */
export class FieldInfoMap {
  private _obj!: Record<string, FieldInfo>;
  private _arr!: FieldInfo[];

  constructor() {
    Object.defineProperty(this, '_obj', {
      enumerable: false,
      configurable: false,
      writable: true,
      value: {},
    });
    Object.defineProperty(this, '_arr', {
      enumerable: false,
      configurable: false,
      writable: true,
      value: [],
    });
  }

  /**
   * Adds a field, at `field.index` if set, otherwise appended at the end
   * (and its `index` is then set accordingly).
   */
  add(field: FieldInfo) {
    const idx = field.index != null ? field.index : this._arr.length;
    this._arr[idx] = field;
    field.index = idx;
    const _obj = this._arr.reduce((a, f) => {
      a[f.name.toUpperCase()] = f;
      return a;
    }, {});
    Object.defineProperty(this, '_obj', {
      enumerable: false,
      configurable: false,
      writable: true,
      value: _obj,
    });
  }

  /** Looks up a field by its zero-based column index, or by name (case-insensitive). */
  get(k: string | number): FieldInfo {
    if (typeof k === 'number') return this._arr[k];
    return this._obj[k.toUpperCase()];
  }

  /** Returns `[name, FieldInfo]` pairs, keyed by the upper-cased field name. */
  entries(): [string, FieldInfo][] {
    return Object.entries(this._obj);
  }

  /** Returns the (upper-cased) field names. */
  keys(): string[] {
    return Object.keys(this._obj);
  }

  /** Returns the fields, in column order. */
  values(): FieldInfo[] {
    return [...this._arr];
  }

  toJSON(): Record<string, FieldInfo> {
    return { ...this._obj };
  }
}
