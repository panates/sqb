import { EventEmitter } from 'events';
import flattenText from 'putil-flattentext';
import merge from 'putil-merge';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import type { GenerateOptions, GenerateResult } from '../types.js';

declare interface QueryClass extends EventEmitter {}

class QueryClass extends Serializable {
  declare protected _comment: Query.Comment[];
  declare protected _params?: Record<string, any>;

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

  comment(args: Query.Comment): this;
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

interface QueryCtor {
  new (): Query;
  (): Query;
  prototype: Query;
}

export const Query = function (this: Query) {
  if (!(this instanceof Query)) return new Query();
  if (this.constructor === Query) {
    throw new TypeError('Query is abstract and cannot be instantiated');
  }
  Serializable.call(this);
  EventEmitter.call(this);
  this._comment = [];
} as QueryCtor;

Query.prototype = QueryClass.prototype;
merge(Query.prototype, EventEmitter.prototype, { descriptor: true });
Query.prototype.constructor = Query;

export interface Query extends QueryClass, EventEmitter {}

export namespace Query {
  export interface Comment {
    comment: string;
    dialect?: string[];
  }
}
