import { SerializationType } from '../enums.js';
import { SerializeContext } from '../serialize-context.js';
import { Query } from './query.js';

export type UnionQueryType = 'all';

export class UnionQuery extends Query {
  _queries: Query[];
  _unionType?: UnionQueryType;

  constructor(queries: Query[], unionType?: UnionQueryType) {
    super();
    this._queries = queries;
    this._unionType = unionType;
  }

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
