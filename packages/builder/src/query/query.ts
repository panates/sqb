import { EventEmitter } from 'events';
import flattenText from 'putil-flattentext';
import merge from 'putil-merge';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { GenerateOptions, GenerateResult } from '../types.js';

export declare interface Query extends EventEmitter {}

export abstract class Query extends Serializable {
  protected _params?: Record<string, any>;

  constructor() {
    super();
    EventEmitter.call(this);
  }

  /**
   * Generates Sql script
   */
  generate(options?: GenerateOptions): GenerateResult {
    const ctx = new SerializeContext(options);
    if (this._params) ctx.params = { ...ctx.params, ...this._params };
    ctx.serializeHooks = this.listeners('serialize');

    /* generate output */
    const sql = this._serialize(ctx);
    return {
      sql: flattenText(sql, { noWrap: !ctx.prettyPrint }),
      params: ctx.preparedParams,
      paramOptions: ctx.paramOptions,
      returningFields: ctx.returningFields,
    };
  }

  values(obj: any): this {
    if (typeof obj !== 'object' || Array.isArray(obj))
      throw new TypeError('Invalid argument');
    this._params = obj;
    return this;
  }
}

merge(Query.prototype, EventEmitter.prototype, { descriptor: true });
