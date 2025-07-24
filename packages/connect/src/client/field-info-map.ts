import { FieldInfo } from './types.js';

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

  get(k: string | number): FieldInfo {
    if (typeof k === 'number') return this._arr[k];
    return this._obj[k.toUpperCase()];
  }

  entries(): [string, FieldInfo][] {
    return Object.entries(this._obj);
  }

  keys(): string[] {
    return Object.keys(this._obj);
  }

  values(): FieldInfo[] {
    return [...this._arr];
  }

  toJSON(): Record<string, FieldInfo> {
    return { ...this._obj };
  }
}
