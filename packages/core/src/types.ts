import {ParamType, SerializationType} from './enums';

export type Maybe<T = any> = T | undefined | null;

export interface SerializerExtension {
    dialect: string;
    serialize?: SerializeFunction;
    // stringify?: (x: any) => string;
    isReservedWord?: IsReservedWordFunction;
}

export interface GenerateOptions {
    /**
     * Dialect that query to be generated for. Etc: postgres, oracle, sqlite ...
     */
    dialect?: string;
    prettyPrint?: boolean;
    paramType?: ParamType;
    values?: Record<string, any>;
    dialectVersion?: string;
}

export interface SerializeContext extends GenerateOptions {
    serializeHooks?: Function[];
    queryParams?: Record<string, any> | any[];
    returningFields?: Record<string, any>;
}

export interface GenerateResult {
    sql: string;
    params?: any;
    returningFields?: Record<string, any>;
}

export interface ReturningData {
    field: string;
    dataType: string;
    table?: string;
    schema?: string;
    alias?: string;
}

export type SerializeFunction = (ctx: SerializeContext, type: SerializationType | string, obj: any,
                                 defFn: DefaultSerializeFunction) => Maybe<string>;
export type DefaultSerializeFunction = (ctx: SerializeContext, o: any) => string;
export type IsReservedWordFunction = (ctx: SerializeContext, s: string) => boolean;
