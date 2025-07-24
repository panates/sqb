import { camelCase, pascalCase } from 'putil-varhelpers';
import { Maybe } from 'ts-gems';
import { Adapter } from './adapter.js';
import { FieldInfoMap } from './field-info-map.js';
import {
  ArrayRow,
  ArrayRowset,
  FieldInfo,
  FieldNaming,
  ObjectRow,
  ObjectRowset,
  QueryRequest,
  ValueTransformFunction,
} from './types.js';

export function applyNamingStrategy(
  value: string,
  namingStrategy?: FieldNaming,
): Maybe<string> {
  if (typeof namingStrategy === 'string' && namingStrategy !== 'original') {
    switch (namingStrategy.toLowerCase()) {
      case 'lowercase':
        return value.toLowerCase();
      case 'uppercase':
        return value.toUpperCase();
      case 'camelcase':
        if (!value.match(/[a-z]/)) return camelCase(value.toLowerCase());
        value = camelCase(value);
        return value[0].toLowerCase() + value.substring(1);
      case 'pascalcase':
        if (!value.match(/[a-z]/)) return pascalCase(value.toLowerCase());
        return pascalCase(value);
      default:
        break;
    }
  } else if (typeof namingStrategy === 'function') return namingStrategy(value);
  return value;
}

export function wrapAdapterFields(
  oldFields: Adapter.Field[],
  fieldNaming?: FieldNaming,
): FieldInfoMap {
  const mapFieldInfo = (f: Adapter.Field, index: number): Maybe<FieldInfo> => {
    const name = applyNamingStrategy(f.fieldName, fieldNaming);
    if (name) return { ...f, name, index } as FieldInfo;
  };
  const result = new FieldInfoMap();
  let i = 0;
  oldFields.forEach(f => {
    const x = mapFieldInfo(f, i);
    if (x) {
      i++;
      result.add(x);
    }
  });
  return result;
}

export function normalizeRowsToObjectRows(
  fields: FieldInfoMap,
  rowType: 'array' | 'object',
  oldRows: ObjectRowset | ArrayRowset,
  options?: Pick<QueryRequest, 'ignoreNulls' | 'transform'>,
): Record<string, any>[] {
  return normalizeRows(fields, rowType, oldRows, {
    ...options,
    objectRows: true,
  }) as Record<string, any>[];
}

export function normalizeRowsToArrayRows(
  fields: FieldInfoMap,
  rowType: 'array' | 'object',
  oldRows: ObjectRowset | ArrayRowset,
  options?: Pick<QueryRequest, 'ignoreNulls' | 'transform'>,
): any[][] {
  return normalizeRows(fields, rowType, oldRows, {
    ...options,
    objectRows: false,
  }) as any[][];
}

function normalizeRows(
  fields: FieldInfoMap,
  rowType: 'array' | 'object',
  oldRows: ObjectRowset | ArrayRowset,
  options: Pick<QueryRequest, 'objectRows' | 'ignoreNulls' | 'transform'>,
): Record<string, any>[] | any[][] {
  const ignoreNulls = options.ignoreNulls && options.objectRows;
  const transform = options.transform;
  const coerceValue: ValueTransformFunction = (v: any, f?: FieldInfo): any => {
    if (v === undefined) return;
    if (transform) v = transform(v, f);
    if (v === null && ignoreNulls) return;
    return v;
  };

  if (options.objectRows) {
    if (rowType === 'array') {
      return (oldRows as ArrayRowset).map((row: ArrayRow) => {
        const r = {};
        for (const f of fields.values()) {
          const v = coerceValue(row[f.index], f);
          if (v !== undefined) r[f.name] = v;
        }
        return r;
      }) as ObjectRowset;
    }

    let hasFieldNaming = false;
    for (const f of fields.values()) {
      if (f.name !== f.fieldName) {
        hasFieldNaming = true;
        break;
      }
    }

    if (hasFieldNaming || transform) {
      return (oldRows as ObjectRowset).map((row: ObjectRow) => {
        const r = {};
        for (const f of fields.values()) {
          const v = coerceValue(row[f.fieldName], f);
          if (v !== undefined) r[f.name] = v;
        }
        return r;
      }) as ObjectRowset;
    }

    if (ignoreNulls) {
      oldRows.forEach(row => {
        for (const [k, v] of Object.entries(row)) {
          if (v === null) delete row[k];
        }
      });
    }

    return oldRows;
  }

  if (rowType === 'array') {
    (oldRows as ArrayRowset).forEach((row: ArrayRow) => {
      for (const [i, v] of row.entries()) {
        row[i] = coerceValue(v, fields.get(i));
      }
    });
    return oldRows;
  }

  return (oldRows as ObjectRowset).map((row: ObjectRow) => {
    const r = [] as ArrayRow;
    for (const f of fields.values()) {
      r[f.index] = coerceValue(row[f.fieldName], f);
    }
    return r;
  }) as ArrayRowset;
}

export function callFetchHooks(
  rows: ObjectRowset | ArrayRowset,
  request: QueryRequest,
): void {
  const fetchHooks = request.fetchHooks;
  if (!fetchHooks) return;
  for (const row of rows) {
    for (const fn of fetchHooks) {
      fn(row, request);
    }
  }
}
