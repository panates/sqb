import {EventEmitter} from 'events';
import merge from 'putil-merge';
import flattenText from 'putil-flattentext';
import {Serializable} from '../Serializable';
import {ParamType} from '../enums';
import {SerializeContext, GenerateOptions, GenerateResult} from '../types';

export declare interface Query extends EventEmitter {
}

export abstract class Query extends Serializable {

    protected _values?: Record<string, any>;
    protected _action?: string;

    constructor() {
        super();
        EventEmitter.call(this);
    }

    /**
     * Generates Sql script
     */
    generate(options?: GenerateOptions): GenerateResult {
        const ctx: SerializeContext = {...options};
        /* paramType default COLON */
        ctx.paramType = ctx.paramType != null ? ctx.paramType : ParamType.COLON;
        if (this._values)
            ctx.values = {...ctx.values, ...this._values};
        ctx.serializeHooks = this.listeners('serialize');
        /* generate output */
        const sql = this._serialize(ctx);
        return {
            sql: flattenText(sql, {noWrap: !ctx.prettyPrint}),
            params: ctx.queryParams,
            returningFields: ctx.returningFields
        }
    }

    values(obj: any): this {
        if (typeof obj !== 'object' || Array.isArray(obj))
            throw new TypeError('Invalid argument');
        this._values = obj;
        return this;
    }

}

merge(Query.prototype, EventEmitter.prototype, {descriptor: true});
