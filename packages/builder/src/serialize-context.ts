import { SerializationType } from './enums.js';
import { SerializerRegistry } from './extensions.js';
import { Query } from './sql/index.js';
import { isLogicalOperator, isQuery, isSqlElement } from './type-guards.js';
import type {
  DefaultSerializeFunction,
  GenerateOptions,
  ParamOptions,
} from './types.js';

/**
 * Carries all per-`generate()`-call state through the serialization of a
 * query tree: the effective {@link GenerateOptions}, the accumulating bind
 * parameters/metadata, and the low-level value-to-SQL conversion helpers
 * every {@link SqlElement} calls into via `ctx.anyToSQL(...)` /
 * `ctx.serialize(...)`. One instance is created per `Query.generate()` call
 * and threaded through the whole `_serialize()` call tree.
 */
export class SerializeContext implements GenerateOptions {
  /**
   * Built-in ANSI-ish reserved words that get double-quoted when they appear
   * as a bare identifier (column/table/alias name) - see
   * {@link SerializeContext.isReservedWord}. A dialect extension can extend
   * this set further via `SerializerExtension.isReservedWord`.
   */
  readonly reservedWords = new Set([
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
    'all',
    'as',
    'asc',
    'case',
    'cast',
    'check',
    'column',
    'desc',
    'else',
    'end',
    'for',
    'in',
    'into',
    'is',
    'on',
    'then',
    'to',
    'union',
    'unique',
    'when',
  ]);

  dialect?: string;
  prettyPrint?: boolean;
  params?: Record<string, any>;
  /** Snapshot of `params` as they were before serialization started, before any implicit params (e.g. from `strictParams`) were added. */
  orgParams?: Record<string, any>;
  dialectVersion?: string;
  strictParams?: boolean;
  /** Listeners registered on the root query's `'serialize'` event, tried before any registered {@link SerializerExtension}. */
  serializeHooks?: Function[];
  /** Accumulated per-parameter type/array metadata, built up as {@link Param} elements serialize. */
  paramOptions?: Record<string, ParamOptions> | ParamOptions[];
  /** Accumulated bind parameter values, built up as {@link Param} elements serialize - this becomes `GenerateResult.params`. */
  preparedParams?: Record<string, any> | any[];
  /** Accumulated `RETURNING`/`OUTPUT` column info, built up as {@link ReturningColumn} elements serialize - this becomes `GenerateResult.returningFields`. */
  returningFields?: { field: string; alias?: string }[];
  /** Counter used to generate unique names (`P$_1`, `P$_2`, ...) for parameters synthesized under `strictParams`. */
  strictParamGenId?: number;

  /**
   * @param rootQuery - The query being serialized; retained so nested elements can refer back to it if needed.
   * @param opts - Initial {@link GenerateOptions}, shallow-copied onto this context.
   */
  constructor(
    readonly rootQuery: Query,
    opts?: GenerateOptions,
  ) {
    if (opts) Object.assign(this, opts);
  }

  /**
   * Serializes one SQL fragment, giving customization a chance to intercept
   * it before falling back to the built-in behavior. Every `_serialize()`
   * implementation in this package funnels its fragment output through this
   * method rather than returning built SQL directly, which is what makes
   * per-query `serialize` event hooks and dialect extensions able to
   * override any individual piece of a query.
   *
   * Resolution order: (1) this context's `serializeHooks` (the root query's
   * `'serialize'` event listeners), in registration order; (2) every
   * registered {@link SerializerExtension} matching `this.dialect`, in
   * registration order; (3) `fallback`. The first of these to return a
   * non-`null`/`undefined` string wins.
   *
   * @param type - The {@link SerializationType} (or extension-defined string) of the fragment.
   * @param o - The fragment-specific data passed to hooks/extensions/fallback.
   * @param fallback - The built-in serializer to use if nothing intercepts this fragment.
   * @returns The resulting SQL text for this fragment.
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
   * Converts an arbitrary JS value into its SQL literal/expression form:
   * `null` -> `null`; an array -> a parenthesized, comma-joined list of the
   * converted elements (going through `SerializationType.ARRAY`, so a
   * dialect can override array literal syntax); a {@link SqlElement} ->
   * its own `_serialize()` result (parenthesized when it's a sub-query or
   * logical operator, so operator precedence is preserved); a `Date`,
   * string, boolean, or number -> the corresponding `*ToSQL()` conversion
   * below, each routed through `serialize()` so a dialect can override the
   * literal format (e.g. a different date literal syntax). Anything else is
   * JSON-stringified and quoted as a string literal.
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
      if (isSqlElement(v)) {
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
    if (isSqlElement(v)) return v._serialize(this);
    return v;
  }

  /**
   * Default string-literal serializer: wraps `val` in single quotes,
   * doubling any embedded single quote to escape it (standard SQL string
   * literal escaping). Overridable per dialect via
   * `SerializationType.STRING_VALUE`.
   */
  stringToSQL(val: string): string {
    return "'" + String(val).replace(/'/g, "''") + "'";
  }

  /**
   * Default boolean-literal serializer: emits the bare SQL keywords `true`/
   * `false`. Overridable per dialect via `SerializationType.BOOLEAN_VALUE`
   * (e.g. a dialect without a native boolean type might emit `1`/`0`).
   */
  booleanToSQL(val: any): string {
    return val ? 'true' : 'false';
  }

  /**
   * Default number-literal serializer: emits the value via string
   * coercion. Overridable per dialect via `SerializationType.NUMBER_VALUE`.
   */
  numberToSQL(val: any): string {
    return '' + val;
  }

  /**
   * Default date-literal serializer: formats `date` (read via its UTC
   * getters) as a quoted `'YYYY-MM-DD'` literal, extended to
   * `'YYYY-MM-DD HH:mm:ss'` when the date carries a non-midnight
   * time-of-day. Overridable per dialect via `SerializationType.DATE_VALUE`
   * (most dialects need a dialect-specific date/timestamp literal syntax).
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
   * Checks whether `s` is a reserved word - either in the built-in
   * {@link SerializeContext.reservedWords} set, or according to any
   * registered {@link SerializerExtension} for the current dialect.
   */
  isReservedWord(s: string | undefined | null): boolean {
    if (!s) return false;
    if (this.reservedWords.has(s.toLowerCase())) return true;
    for (const ext of SerializerRegistry.items()) {
      if (ext.dialect === this.dialect && ext.isReservedWord) {
        if (ext.isReservedWord(this, s)) return true;
      }
    }
    return false;
  }

  /**
   * Returns `s` double-quoted if it {@link isReservedWord}, or unchanged
   * otherwise. Used whenever a bare identifier (column, alias, table name)
   * is emitted, so a reserved word like `"order"` doesn't break the
   * generated SQL.
   */
  escapeReserved(s: string | undefined | null): string {
    if (!s) return '';
    if (this.isReservedWord(s)) return '"' + s + '"';
    return s;
  }
}
