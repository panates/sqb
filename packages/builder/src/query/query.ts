import { EventEmitter } from 'events';
import flattenText from 'putil-flattentext';
import merge from 'putil-merge';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { GenerateOptions, GenerateResult } from '../types.js';

export declare interface Query extends EventEmitter {}

export interface QueryCommentArgs {
  comment: string;
  dialect?: string[];
}

export interface QueryIndexHintArgs {
  index: string[];
  dialect?: string[];
}

export abstract class Query extends Serializable {
  protected _comment: QueryCommentArgs[] = [];
  protected _params?: Record<string, any>;

  constructor() {
    super();
    EventEmitter.call(this);
  }

  /**
   * Generates Sql script
   */
  generate(options?: GenerateOptions): GenerateResult {
    const ctx = new SerializeContext(this, options);
    if (this._params) ctx.params = { ...ctx.params, ...this._params };
    ctx.serializeHooks = this.listeners('serialize');

    /* generate output */
    let sql = this._serialize(ctx);
    sql = flattenText(sql, { noWrap: !ctx.prettyPrint });
    if (this._comment.length) {
      const comment = this._comment
        .filter(
          x =>
            !ctx.dialect ||
            !x.dialect?.length ||
            x.dialect.includes(ctx.dialect),
        )
        .map(x => x.comment.replace(/\n/g, '\n  '))
        .join('\n');
      if (comment) {
        sql = `/*${comment}*/\n${sql}`;
      }
    }
    return {
      sql,
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

  comment(args: QueryCommentArgs): this;
  comment(text: string, dialect?: string[]): this;
  comment(arg0: any, dialect?: string[]): this {
    if (typeof arg0 === 'string')
      this._comment.push({
        comment: arg0,
        dialect: Array.isArray(dialect) ? dialect : undefined,
      });
    else if (typeof arg0 === 'object' && typeof arg0.comment === 'string')
      this._comment.push({
        comment: arg0.comment,
        dialect: Array.isArray(arg0.dialect) ? arg0.dialect : undefined,
      });
    return this;
  }
}

merge(Query.prototype, EventEmitter.prototype, { descriptor: true });
