import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { SerializeContext } from '../serialize-context.js';
import { ReturningColumn } from './elements/returning-column.js';
import { Query } from './query.js';

class ReturningQueryClass extends Query {
  _returningColumns?: ReturningColumn[];

  /**
   *
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
   *
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
