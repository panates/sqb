import { DataType, SerializationType } from './enums.js';
import type { SerializeContext } from './serialize-context.js';

export type SerializeFunction = (
  ctx: SerializeContext,
  type: SerializationType | string,
  obj: any,
  defFn: DefaultSerializeFunction,
) => string | undefined;
export type DefaultSerializeFunction = (
  ctx: SerializeContext,
  o: any,
) => string;
export type IsReservedWordFunction = (
  ctx: SerializeContext,
  s: string,
) => boolean;

export interface SerializerExtension {
  dialect: string;
  serialize?: SerializeFunction;
  isReservedWord?: IsReservedWordFunction;
}

export interface GenerateOptions {
  /**
   * Dialect that query to be generated for. Etc: postgres, oracle, sqlite ...
   */
  dialect?: string;
  prettyPrint?: boolean;
  params?: Record<string, any>;
  dialectVersion?: string;
  strictParams?: boolean;
}

export interface ParamOptions {
  dataType?: DataType;
  isArray?: boolean;
}

export interface GenerateResult {
  sql: string;
  params?: any;
  paramOptions?: Record<string, ParamOptions> | ParamOptions[];
  returningFields?: { field: string; alias?: string }[];
}
