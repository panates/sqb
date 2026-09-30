import type { Adapter, QueryRequest } from '@sqb/connect';
import { tokenize } from 'fast-tokenizer';
import sql, {
  type ConnectionPool,
  type IColumnMetadata,
  type Request,
  type Transaction,
} from 'mssql';
import { MssqlCursor } from './mssql-cursor.js';

/** Maps the `mssql` driver's column type names to SQB's portable `{ dataType, jsType }` pair. */
const typeNameMap: Record<string, { dataType: string; jsType: string }> = {
  VarChar: { dataType: 'VARCHAR', jsType: 'string' },
  NVarChar: { dataType: 'NVARCHAR', jsType: 'string' },
  Char: { dataType: 'CHAR', jsType: 'string' },
  NChar: { dataType: 'NCHAR', jsType: 'string' },
  Text: { dataType: 'TEXT', jsType: 'string' },
  NText: { dataType: 'NTEXT', jsType: 'string' },
  Xml: { dataType: 'XML', jsType: 'string' },
  UniqueIdentifier: { dataType: 'UNIQUEIDENTIFIER', jsType: 'string' },
  Int: { dataType: 'INT', jsType: 'number' },
  BigInt: { dataType: 'BIGINT', jsType: 'number' },
  TinyInt: { dataType: 'TINYINT', jsType: 'number' },
  SmallInt: { dataType: 'SMALLINT', jsType: 'number' },
  Float: { dataType: 'FLOAT', jsType: 'number' },
  Real: { dataType: 'REAL', jsType: 'number' },
  Numeric: { dataType: 'NUMERIC', jsType: 'number' },
  Decimal: { dataType: 'DECIMAL', jsType: 'number' },
  SmallMoney: { dataType: 'SMALLMONEY', jsType: 'number' },
  Money: { dataType: 'MONEY', jsType: 'number' },
  Bit: { dataType: 'BIT', jsType: 'boolean' },
  Date: { dataType: 'DATE', jsType: 'Date' },
  DateTime: { dataType: 'DATETIME', jsType: 'Date' },
  DateTime2: { dataType: 'DATETIME2', jsType: 'Date' },
  DateTimeOffset: { dataType: 'DATETIMEOFFSET', jsType: 'Date' },
  SmallDateTime: { dataType: 'SMALLDATETIME', jsType: 'Date' },
  Time: { dataType: 'TIME', jsType: 'Date' },
  Binary: { dataType: 'BINARY', jsType: 'Buffer' },
  VarBinary: { dataType: 'VARBINARY', jsType: 'Buffer' },
  Image: { dataType: 'IMAGE', jsType: 'Buffer' },
};

/** Matches a whole tokenized `:name` parameter reference (with any leading whitespace preserved), used by {@link MssqlConnection._normalizeNamedParams}. */
const NAMED_PARAM_PATTERN = /^( *):([a-zA-Z_]\w*)$/;

/**
 * `@sqb/connect` {@link Adapter.Connection} wrapping an `mssql`
 * `ConnectionPool`: translates `QueryRequest`s into driver calls (including
 * cursor-mode streaming and `RETURNING`-via-`OUTPUT`-clause rewriting,
 * since T-SQL has no `RETURNING`) and normalizes results/column metadata
 * back into SQB's portable shape.
 */
export class MssqlConnection implements Adapter.Connection {
  private intlcon?: ConnectionPool;
  private _transaction?: Transaction;
  private _openCursor?: MssqlCursor;

  constructor(pool: ConnectionPool) {
    this.intlcon = pool;
  }

  /** Unsupported by the `mssql` driver at the pool level - always `undefined`. */
  get sessionId(): any {
    return undefined;
  }

  /** Closes any open cursor/transaction first (both would otherwise make the pool hang), then closes the underlying connection pool. */
  async close() {
    if (!this.intlcon) return;
    const pool = this.intlcon;
    this.intlcon = undefined;
    // A not-fully-consumed cursor keeps its streaming request open, and an
    // open transaction keeps its connection checked out of the pool —
    // both make pool.close() hang forever, so clear them first.
    if (this._openCursor) {
      const cursor = this._openCursor;
      this._openCursor = undefined;
      await cursor.close();
    }
    if (this._transaction) {
      const transaction = this._transaction;
      this._transaction = undefined;
      await transaction.rollback().catch(() => {});
    }
    await pool.close();
  }

  /** Rolls back any open transaction, readying the connection to be pooled/reused. */
  async reset() {
    return this.rollback();
  }

  /** Begins a transaction, unless one is already open. */
  async startTransaction(): Promise<void> {
    assertDefined(this.intlcon);
    if (this._transaction) return;
    const transaction = new sql.Transaction(this.intlcon);
    await transaction.begin();
    this._transaction = transaction;
  }

  /** Commits the current transaction, if any. */
  async commit(): Promise<void> {
    if (!this._transaction) return;
    const transaction = this._transaction;
    this._transaction = undefined;
    await transaction.commit();
  }

  /** Rolls back the current transaction, if any. */
  async rollback(): Promise<void> {
    if (!this._transaction) return;
    const transaction = this._transaction;
    this._transaction = undefined;
    await transaction.rollback();
  }

  getInTransaction(): boolean {
    return !!this._transaction;
  }

  /** Validates the connection with a trivial `SELECT 1`. */
  async test(): Promise<void> {
    assertDefined(this.intlcon);
    await this.intlcon.request().query('select 1');
  }

  /** Creates a new `mssql` request bound to the current transaction, if one is open, or to the pool directly otherwise. */
  private _newRequest(): Request {
    assertDefined(this.intlcon);
    return this._transaction
      ? this._transaction.request()
      : this.intlcon.request();
  }

  /**
   * Executes one query. For an `INSERT`/`UPDATE`/`DELETE` with
   * `returningFields`, rewrites the SQL to inject T-SQL's `OUTPUT` clause
   * (referencing the `INSERTED`/`DELETED` pseudo-tables) right before
   * `VALUES`/`WHERE` - `@sqb/mssql-dialect` deliberately produces no
   * `RETURNING` clause of its own, since `OUTPUT` can't be appended at the
   * statement's end the way `RETURNING` can. In cursor mode, streams the
   * request and wraps it in an {@link MssqlCursor}. Otherwise executes
   * directly, reading result rows/metadata off `result.recordset`.
   */
  async execute(query: QueryRequest): Promise<Adapter.Response> {
    assertDefined(this.intlcon);
    if (!query.autoCommit && !this._transaction) await this.startTransaction();
    const out: Adapter.Response = {};

    if (query.normalizeNamedParams) this._normalizeNamedParams(query);

    const m = query.sql.match(
      /\b(insert into|update|delete from)\b ("?\w+"?)/i,
    );
    if (m) {
      const stmtType = m[1].toLowerCase();
      let sqlText = query.sql;
      if (query.returningFields) {
        const prefix = stmtType === 'delete from' ? 'DELETED.' : 'INSERTED.';
        const outputCols = query.returningFields
          .map(f => prefix + f.field + (f.alias ? ' as ' + f.alias : ''))
          .join(', ');
        const outputClause = 'OUTPUT ' + outputCols;
        const valuesIdx = sqlText.search(/\bvalues\b/i);
        const whereIdx = sqlText.search(/\bwhere\b/i);
        const idx = valuesIdx >= 0 ? valuesIdx : whereIdx;
        sqlText =
          idx >= 0
            ? sqlText.slice(0, idx) + outputClause + '\n' + sqlText.slice(idx)
            : sqlText + '\n' + outputClause;
      }
      const request = this._newRequest();
      this._bindParams(request, query.params);
      const result = await request.query(sqlText);
      out.rowsAffected = result.rowsAffected.reduce((a, b) => a + b, 0);
      if (query.autoCommit) await this.commit();
      if (query.returningFields && result.recordset?.length) {
        const rowType = query.objectRows ? 'object' : 'array';
        out.fields = this._convertFields(result.recordset.columns);
        out.rowType = rowType;
        out.rows =
          rowType === 'array'
            ? result.recordset.map(r => Object.values(r))
            : result.recordset;
      }
      return out;
    }

    const rowType = query.objectRows ? 'object' : 'array';
    if (query.cursor) {
      const request = this._newRequest();
      this._bindParams(request, query.params);
      request.stream = true;
      const columnsPromise = new Promise<IColumnMetadata>(resolve =>
        request.once('recordset', resolve),
      );
      const cursor = new MssqlCursor(request, { rowType });
      this._openCursor = cursor;
      request.query(query.sql).catch(() => {
        /* surfaced via the cursor's 'error' listener */
      });
      out.fields = this._convertFields(await columnsPromise);
      out.rowType = rowType;
      out.cursor = cursor;
      return out;
    }

    const request = this._newRequest();
    this._bindParams(request, query.params);
    const result = await request.query(query.sql);
    if (result.recordset) {
      out.fields = this._convertFields(result.recordset.columns);
      out.rowType = rowType;
      const rows = query.fetchRows
        ? result.recordset.slice(0, query.fetchRows)
        : result.recordset;
      out.rows = rowType === 'array' ? rows.map(r => Object.values(r)) : rows;
    }
    return out;
  }

  /** Binds each query parameter as a named `mssql` request input. */
  private _bindParams(request: Request, params?: Record<string, any>) {
    if (!params) return;
    for (const k of Object.keys(params)) request.input(k, params[k]);
  }

  /** Converts the driver's column metadata (unordered by column index) into SQB's portable, index-ordered {@link Adapter.Field} shape via {@link typeNameMap}. */
  private _convertFields(columns: IColumnMetadata) {
    const result: Adapter.Field[] = [];
    const entries = Object.values(columns).sort((a, b) => a.index - b.index);
    for (const c of entries) {
      const typeName =
        typeof c.type === 'function' ? c.type.name : (c.type as any)?.name;
      const t = typeNameMap[typeName] || { dataType: 'UNKNOWN', jsType: 'any' };
      result.push({
        fieldName: c.name,
        dataType: t.dataType,
        jsType: t.jsType,
        nullable: c.nullable,
        _inf: c,
      });
    }
    return result;
  }

  /**
   * Rewrites `:name` parameter placeholders to `mssql`'s native `@name`
   * syntax in place, via a bracket/quote-aware tokenizer (rather than a
   * plain regex replace) so a `:name`-shaped substring inside a string
   * literal or a T-SQL `[bracketed identifier]` isn't mistaken for a
   * parameter - see the inline comments for why each is handled
   * differently.
   */
  _normalizeNamedParams(query: QueryRequest) {
    const tokenizer = tokenize(query.sql, {
      brackets: false,
      delimiters: undefined,
      quotes: true,
      keepBrackets: true,
      keepQuotes: true,
      keepDelimiters: true,
      emptyTokens: true,
    });
    let token: string | null;
    let out = '';
    // quotes:true hands back an entire string/double-quoted-identifier
    // literal as one token, so a ":name" occurring inside one never
    // matches the anchored NAMED_PARAM_PATTERN at all. T-SQL's [bracket]
    // identifier quoting isn't a "quote" character the tokenizer knows
    // about though (brackets:false), so "[col:name]" comes back as three
    // separate tokens ("[col", ":name", "]") - track bracket state
    // explicitly so a ":name" inside one isn't mistaken for a param.
    let inBracket = false;
    while ((token = tokenizer.next())) {
      const trimmed = token.trim();
      if (inBracket) {
        if (trimmed.includes(']')) inBracket = false;
      } else if (trimmed.startsWith('[')) {
        inBracket = true;
      } else {
        const m = NAMED_PARAM_PATTERN.exec(token);
        if (m) {
          const [, leading, name] = m;
          token = leading + '@' + name;
        }
      }
      out += token;
    }
    query.sql = out;
  }
}

/** Throws if the connection has already been closed. */
function assertDefined(d: unknown): asserts d {
  if (d == null) throw new Error('DB session is closed');
}
