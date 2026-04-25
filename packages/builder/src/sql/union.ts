import { SerializationType } from '../enums.js';
import { SerializeContext } from '../serialize-context.js';
import { Query } from './query.js';

export type UnionQueryType = 'all';

class UnionClass extends Query {
  _queries!: Query[];
  _unionType?: UnionQueryType;

  get _type(): SerializationType {
    return SerializationType.UNION_QUERY;
  }

  /**
   * Performs serialization
   */
  _serialize(ctx: SerializeContext): string {
    const queries = this._queries.map(q => q._serialize(ctx));
    const q = {
      queries,
      unionType: this._unionType,
    };
    return ctx.serialize(this._type, q, () => this.__defaultSerialize(ctx, q));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return o.queries.join(
      o.unionType === 'all' ? '\nUNION ALL\n' : '\nUNION\n',
    );
  }
}

interface UnionCtor {
  new (queries: Query[], unionType?: UnionQueryType): Union;
  (queries: Query[], unionType?: UnionQueryType): Union;
  prototype: Union;
}

export const Union = function (
  this: Union,
  queries: Query[],
  unionType?: UnionQueryType,
) {
  if (!(this instanceof Union)) return new Union(queries, unionType);
  Query.call(this);
  this._queries = queries;
  this._unionType = unionType;
} as UnionCtor;

Union.prototype = UnionClass.prototype;
Union.prototype.constructor = Union;

export interface Union extends UnionClass {}
