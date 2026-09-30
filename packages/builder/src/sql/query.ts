import { EventEmitter } from 'events';
import flattenText from 'putil-flattentext';
import merge from 'putil-merge';
import { SqlElement } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import type { GenerateOptions, GenerateResult } from '../types.js';

declare interface QueryClass extends EventEmitter {}

/**
 * Abstract base of every top-level query builder ({@link Select},
 * {@link Insert}, {@link Update}, {@link Delete}, {@link Union}). Provides
 * the shared `generate()` entry point, bind-parameter assignment via
 * `values()`, and SQL comment support, on top of both {@link SqlElement}
 * and Node's `EventEmitter` (queries emit a `'serialize'` event whose
 * listeners become {@link SerializeContext.serializeHooks}, and a `'fetch'`
 * event used by consumers such as `@sqb/connect`).
 */
class QueryClass extends SqlElement {
  declare protected _comment: Query.Comment[];
  declare protected _params?: Record<string, any>;

  /**
   * Serializes this query into SQL text and bind-parameter metadata for a
   * specific dialect. This is the main entry point of the whole package -
   * everything else exists to build up the query tree this method walks.
   *
   * @param options - Target dialect, formatting, and parameter-handling options.
   * @returns The generated SQL plus bind parameters/`RETURNING` field metadata.
   */
  generate(options?: GenerateOptions): GenerateResult {
    const ctx = new SerializeContext(this, options);
    if (this._params) ctx.params = { ...ctx.params, ...this._params };
    ctx.orgParams = { ...ctx.params };
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

  /**
   * Attaches bind-parameter values to this query, used to resolve
   * {@link Param}/`:name` placeholders when `generate()` is called.
   *
   * @throws {TypeError} If `obj` isn't a plain object.
   */
  values(obj: any): this {
    if (typeof obj !== 'object' || Array.isArray(obj))
      throw new TypeError('Invalid argument');
    this._params = obj;
    return this;
  }

  /**
   * Attaches a SQL comment that gets emitted (as `/* ... *\/`) immediately
   * before the generated query text.
   *
   * @param args - A `{ comment, dialect? }` object; `dialect`, if given, restricts the comment to those dialects.
   */
  comment(args: Query.Comment): this;
  /**
   * Attaches a SQL comment that gets emitted (as `/* ... *\/`) immediately
   * before the generated query text.
   *
   * @param text - The comment text.
   * @param dialect - If given, restricts the comment to these dialects; omitted means all dialects.
   */
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

/**
 * Abstract base constructor for every query builder. Not meant to be
 * constructed directly - use a concrete subclass such as {@link Select},
 * {@link Insert}, {@link Update}, {@link Delete}, or {@link Union}.
 *
 * @throws {TypeError} If instantiated directly rather than through a subclass.
 */
export const Query = function (this: Query) {
  if (!(this instanceof Query)) return new Query();
  if (this.constructor === Query) {
    throw new TypeError('Query is abstract and cannot be instantiated');
  }
  SqlElement.call(this);
  EventEmitter.call(this);
  this._comment = [];
} as QueryCtor;

Query.prototype = QueryClass.prototype;
merge(Query.prototype, EventEmitter.prototype, { descriptor: true });
Query.prototype.constructor = Query;

export interface Query extends QueryClass, EventEmitter {}

export namespace Query {
  /** A single SQL comment attached via {@link QueryClass.comment}. */
  export interface Comment {
    /** The comment text. */
    comment: string;
    /** Restricts the comment to these dialects; omitted means all dialects. */
    dialect?: string[];
  }
}
