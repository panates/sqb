import { DataType, SerializationType } from './enums.js';
import type { SerializeContext } from './serialize-context.js';

/**
 * Signature of a dialect-specific (or per-query, via a `serialize` event
 * hook) serialization override.
 *
 * @param ctx - The active serialization context for the current `generate()` call.
 * @param type - The {@link SerializationType} (or extension-defined string) of the fragment being serialized.
 * @param obj - The fragment-specific data being serialized (shape depends on `type`).
 * @param defFn - The library's default serializer for this fragment; call it to fall back to standard SQL.
 * @returns The SQL text for this fragment, or `undefined`/`null` to defer to the next hook, extension, or the default serializer.
 */
export type SerializeFunction = (
  ctx: SerializeContext,
  type: SerializationType | string,
  obj: any,
  defFn: DefaultSerializeFunction,
) => string | undefined;

/**
 * Signature of the library's built-in fallback serializer for a given
 * fragment, passed to a {@link SerializeFunction} so it can defer to the
 * default behavior after inspecting or short-circuiting on the fragment.
 */
export type DefaultSerializeFunction = (
  ctx: SerializeContext,
  o: any,
) => string;

/**
 * Signature of a dialect extension's reserved-word check, used by
 * {@link SerializeContext.isReservedWord} to add dialect-specific keywords
 * (beyond the built-in ANSI reserved word set) that must be quoted when they
 * appear as an identifier.
 */
export type IsReservedWordFunction = (
  ctx: SerializeContext,
  s: string,
) => boolean;

/**
 * A dialect plugin registered via {@link SerializerRegistry.register}. Lets a
 * `@sqb/*-dialect` package override how specific SQL fragments serialize for
 * one `dialect` name (e.g. `'postgres'`, `'oracle'`), and/or extend the set
 * of identifiers that must be quoted because they're reserved words in that
 * dialect.
 */
export interface SerializerExtension {
  /** The dialect name this extension applies to (matched against `GenerateOptions.dialect`). */
  dialect: string;
  /** Optional per-fragment serialization override for this dialect. */
  serialize?: SerializeFunction;
  /** Optional dialect-specific reserved-word check, in addition to the built-in ANSI set. */
  isReservedWord?: IsReservedWordFunction;
}

/**
 * Options accepted by a query's `generate()` method, controlling which
 * dialect the SQL is produced for and how parameters/formatting are handled.
 */
export interface GenerateOptions {
  /**
   * Dialect that query to be generated for. Etc: postgres, oracle, sqlite ...
   */
  dialect?: string;
  /** When true, formats the generated SQL across multiple indented lines instead of a single compact line. */
  prettyPrint?: boolean;
  /** Values to substitute for `Param`/`:name` placeholders that appear in the query. */
  params?: Record<string, any>;
  /** Optional dialect version string, forwarded to dialect extensions that need to branch on it (e.g. syntax available only from a certain version). */
  dialectVersion?: string;
  /**
   * When true, every literal value on the right-hand side of a comparison
   * operator is rewritten into a generated bind parameter (instead of being
   * inlined as a SQL literal) - see {@link CompOperator}. Useful for
   * producing parameterized SQL for prepared-statement execution.
   */
  strictParams?: boolean;
}

/**
 * Per-parameter metadata attached to a bind parameter during serialization,
 * so a database driver can bind the value with the right type/array-ness
 * instead of relying on inference.
 */
export interface ParamOptions {
  /** The parameter's portable data type, if known. */
  dataType?: DataType;
  /** Whether the bound value is (or should be treated as) an array. */
  isArray?: boolean;
}

/**
 * The result of calling `generate()` on a query: the SQL text plus enough
 * metadata to execute it against a real database driver.
 */
export interface GenerateResult {
  /** The generated SQL text. */
  sql: string;
  /** Bind parameter values, keyed by name (or as a positional array, depending on dialect). */
  params?: any;
  /** Per-parameter type/array metadata, in the same shape (object or array) as `params`. */
  paramOptions?: Record<string, ParamOptions> | ParamOptions[];
  /** The columns requested via `.returning(...)`, if any, with their optional aliases - lets a caller map result rows back to field names. */
  returningFields?: { field: string; alias?: string }[];
}
