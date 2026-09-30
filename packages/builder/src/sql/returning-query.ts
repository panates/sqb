import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { SerializeContext } from '../serialize-context.js';
import { ReturningColumn } from './elements/returning-column.js';
import { Query } from './query.js';

/**
 * Abstract base for queries that support a `RETURNING` clause
 * ({@link Insert} and {@link Update}). Not meant to be constructed directly.
 */
class ReturningQueryClass extends Query {
  _returningColumns?: ReturningColumn[];

  /**
   * Sets the `RETURNING` column list, requesting the given columns of each
   * affected row back from the database.
   *
   * @param columns - Column names, each parsed as `field [as alias]`.
   */
  returning(...columns: string[]): this {
    if (!columns) return this;
    // noinspection JSMismatchedCollectionQueryUpdate
    this._returningColumns = columns.length
      ? columns.reduce<ReturningColumn[]>((a, v) => {
          if (v) a.push(ReturningColumn(v));
          return a;
        }, [])
      : undefined;
    return this;
  }

  /**
   * Serializes the `RETURNING` clause, or an empty string if `.returning(...)`
   * was never called. Also records the requested fields onto
   * `ctx.returningFields` for the caller to read back off `GenerateResult`.
   */
  protected __serializeReturning(ctx: SerializeContext): string {
    if (!(this._returningColumns && this._returningColumns.length)) return '';
    const arr: string[] = [];
    ctx.returningFields = [];
    for (const t of this._returningColumns) {
      const s = t._serialize(ctx);
      /* istanbul ignore else */
      if (s) arr.push(s);
    }
    return ctx.serialize(SerializationType.RETURNING_BLOCK, arr, () => {
      const s = printArray(arr);
      return s ? 'returning ' + s : '';
    });
  }
}

interface ReturningQueryCtor {
  new (): ReturningQuery;
  (): ReturningQuery;
  prototype: ReturningQuery;
}

/**
 * Abstract base constructor for queries that support a `RETURNING` clause.
 * Not meant to be constructed directly - use {@link Insert} or
 * {@link Update}.
 *
 * @throws {TypeError} If instantiated directly rather than through a subclass.
 */
export const ReturningQuery = function (this: ReturningQuery) {
  if (!(this instanceof ReturningQuery)) return new ReturningQuery();
  if (this.constructor === ReturningQuery) {
    throw new TypeError(
      'ReturningQuery is abstract and cannot be instantiated',
    );
  }
  Query.call(this);
} as ReturningQueryCtor;

ReturningQuery.prototype = ReturningQueryClass.prototype;
ReturningQuery.prototype.constructor = ReturningQuery;

export interface ReturningQuery extends ReturningQueryClass {}
