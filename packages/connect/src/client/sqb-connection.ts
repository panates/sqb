import { classes } from '@sqb/builder';
import assert from 'assert';
import _debug from 'debug';
import { TaskQueue } from 'power-tasks';
import {
  coalesce,
  coerceToBoolean,
  coerceToInt,
  coerceToString,
} from 'putil-varhelpers';
import { AsyncEventEmitter, TypedEventEmitterClass } from 'strict-typed-events';
import { Type } from 'ts-gems';
import { EntityMetadata } from '../orm/model/entity-metadata.js';
import { Repository } from '../orm/repository.class.js';
import { Adapter } from './adapter.js';
import { Cursor } from './cursor.js';
import {
  callFetchHooks,
  normalizeRowsToArrayRows,
  normalizeRowsToObjectRows,
  wrapAdapterFields,
} from './helpers.js';
import { SqbClient } from './sqb-client.js';
import {
  ConnectionOptions,
  ExecuteHookFunction,
  FetchFunction,
  FieldNaming,
  QueryExecuteOptions,
  QueryRequest,
  QueryResult,
} from './types.js';

const debug = _debug('sqb:connection');

interface SqbConnectionEvents {
  close: () => void;
  execute: (request: QueryRequest) => void;
  error: (error: Error) => void;
  retain: (refCount: number) => void;
  release: (refCount: number) => void;
  'start-transaction': () => void;
  'set-savepoint': () => void;
  'release-savepoint': () => void;
  'rollback-savepoint': () => void;
  commit: () => void;
  rollback: () => void;
}

export class SqbConnection extends TypedEventEmitterClass<SqbConnectionEvents>(
  AsyncEventEmitter,
) {
  private _intlcon?: Adapter.Connection;
  private readonly _tasks = new TaskQueue();
  private readonly _options?: ConnectionOptions;
  private _inTransaction: boolean = false;
  private _refCount = 1;

  constructor(
    public readonly client: SqbClient,
    adapterConnection: Adapter.Connection,
    options?: ConnectionOptions,
  ) {
    super();
    this._intlcon = adapterConnection;
    this._options = options || {};
  }

  /**
   * Returns session id
   */
  get sessionId(): string {
    return this._intlcon && this._intlcon.sessionId;
  }

  /**
   * Returns reference counter value
   */
  get refCount(): number {
    return this._refCount;
  }

  /**
   * Returns true if transaction started
   */
  get inTransaction(): boolean {
    if (this._intlcon && typeof this._intlcon.getInTransaction === 'function') {
      this._inTransaction = this._intlcon.getInTransaction();
    }
    return this._inTransaction;
  }

  /**
   * Increases internal reference counter to keep session alive
   */
  retain(): void {
    this._refCount++;
    debug('[%s] retain | refCount: %s', this.sessionId, this._refCount);
    this.emit('retain', this._refCount);
  }

  /**
   * Decreases the internal reference counter.
   * When reference count is 0, connection returns to the pool.
   * Returns true if connection released.
   */
  release(): boolean {
    if (!this._intlcon) return true;
    const ref = --this._refCount;
    this.emit('release', this._refCount);
    debug('[%s] release | refCount: %s', this.sessionId, ref);
    if (!ref) {
      this.close().catch(() => 0);
      return true;
    }
    return false;
  }

  /**
   * Immediately releases the connection.
   */
  async close(): Promise<void> {
    if (!this._intlcon) return;
    await this.emitAsyncSerial('close');
    const intlcon = this._intlcon;
    this._intlcon = undefined;
    this.client.pool.release(intlcon, (e: any) => {
      if (e) this.client.emit('error', e);
    });
    debug('[%s] closed', intlcon.sessionId);
  }

  async execute(
    query: string | classes.Query,
    options?: QueryExecuteOptions,
  ): Promise<any> {
    if (!this._intlcon)
      throw new Error(`Can't execute query, because connection is released`);
    return this._tasks.enqueue(() => this._execute(query, options)).toPromise();
  }

  getRepository<T>(
    entity: Type<T> | string,
    opts?: { schema?: string },
  ): Repository<T> {
    let ctor;
    if (typeof entity === 'string') {
      ctor = this.client.getEntity<T>(entity);
      if (!ctor) throw new Error(`Repository "${entity}" is not registered`);
    } else ctor = entity;
    const entityDef = EntityMetadata.get(ctor);
    if (!entityDef)
      throw new Error(`You must provide an @Entity annotated constructor`);
    return new Repository<T>(entityDef, this, opts?.schema);
  }

  async getSchema(): Promise<string> {
    assert.ok(
      this._intlcon,
      `Can't set schema, because connection is released`,
    );
    assert.ok(
      this._intlcon.getSchema,
      `${this.client.dialect} adapter does have Schema support`,
    );
    return await this._intlcon.getSchema();
  }

  async setSchema(schema: string): Promise<void> {
    assert.ok(
      this._intlcon,
      `Can't set schema, because connection is released`,
    );
    assert.ok(
      this._intlcon.setSchema,
      `${this.client.dialect} adapter does have Schema support`,
    );
    await this._intlcon.setSchema(schema);
  }

  /**
   * Executes a query
   */
  protected async _execute(
    query: string | classes.Query,
    options?: QueryExecuteOptions,
  ): Promise<any> {
    assert.ok(
      this._intlcon,
      `Can't execute query, because connection is released`,
    );
    const intlcon = this._intlcon;
    this.retain();
    try {
      const startTime = Date.now();
      const request = this._prepareQueryRequest(query, options);
      debug('[%s] execute | %o', this.sessionId, request);
      this.emit('execute', request);

      // Call execute hooks
      if (request.executeHooks) {
        for (const fn of request.executeHooks) {
          await fn(this, request);
        }
      }

      const response = await intlcon.execute(request);
      if (!response)
        throw new Error('Database adapter returned an empty response');

      const result: QueryResult = {
        executeTime: Date.now() - startTime,
      };

      if (request.showSql) result.query = request;

      if (response.rows || response.cursor) {
        if (!response.fields)
          throw new Error('Adapter did not returned fields info');
        if (!response.rowType)
          throw new Error('Adapter did not returned rowType');
        result.fields = wrapAdapterFields(response.fields, request.fieldNaming);
        result.rowType = response.rowType;

        if (response.rows) {
          result.rows = request.objectRows
            ? normalizeRowsToObjectRows(
                result.fields,
                response.rowType,
                response.rows,
                request,
              )
            : normalizeRowsToArrayRows(
                result.fields,
                response.rowType,
                response.rows,
                request,
              );
          callFetchHooks(result.rows, request);
        } else if (response.cursor) {
          const cursor = (result.cursor = new Cursor(
            this,
            result.fields,
            response.cursor,
            request,
          ));
          const hook = () => cursor.close();
          cursor.once('close', () => this.off('close', hook));
          this.on('close', hook);
        }
      }

      if (response.rowsAffected) result.rowsAffected = response.rowsAffected;

      return result;
    } finally {
      this.release();
    }
  }

  async startTransaction(): Promise<void> {
    if (!this._intlcon)
      throw new Error(
        'Can not call startTransaction() on a released connection',
      );
    await this._intlcon.startTransaction();
    this._inTransaction = true;
    this.emit('start-transaction');
  }

  async commit(): Promise<void> {
    if (!this._intlcon)
      throw new Error('Can not call commit() on a released connection');
    await this._intlcon.commit();
    this._inTransaction = false;
    this.emit('commit');
  }

  async rollback(): Promise<void> {
    if (!this._intlcon)
      throw new Error('Can not call rollback() on a released connection');
    await this._intlcon.rollback();
    this._inTransaction = false;
    this.emit('rollback');
  }

  async setSavepoint(savepoint: string): Promise<void> {
    if (!this._intlcon)
      throw new Error('Can not call setSavepoint() on a released connection');
    if (typeof this._intlcon.setSavepoint !== 'function') {
      throw new Error(
        this.client.driver + ' does not support setSavepoint method',
      );
    }
    if (!this.inTransaction) await this.startTransaction();
    await this._intlcon.setSavepoint(savepoint);
    this.emit('set-savepoint');
  }

  async releaseSavepoint(savepoint: string): Promise<void> {
    if (!this._intlcon)
      throw new Error(
        'Can not call releaseSavepoint() on a released connection',
      );
    if (typeof this._intlcon.releaseSavepoint !== 'function') {
      throw new Error(
        this.client.driver + ' does not support releaseSavepoint method',
      );
    }
    await this._intlcon.releaseSavepoint(savepoint);
    this.emit('release-savepoint');
  }

  async rollbackSavepoint(savepoint: string): Promise<void> {
    if (!this._intlcon)
      throw new Error(
        'Can not call rollbackSavepoint() on a released connection',
      );
    if (typeof this._intlcon.rollbackSavepoint !== 'function') {
      throw new Error(
        this.client.driver + ' does not support rollbackSavepoint method',
      );
    }
    await this._intlcon.rollbackSavepoint(savepoint);
    this.emit('rollback-savepoint');
  }

  async test(): Promise<void> {
    if (!this._intlcon)
      throw new Error('Can not call test() on a released connection');
    await this._intlcon.test();
  }

  private _prepareQueryRequest(
    query: string | classes.Query,
    options: QueryExecuteOptions = {},
  ): QueryRequest {
    if (!this._intlcon) throw new Error('Session released');
    const defaults = this.client.defaults;

    const request: QueryRequest = {
      dialect: this.client.dialect,
      sql: '',
      autoCommit: this.inTransaction
        ? false
        : coerceToBoolean(
            coalesce(
              options.autoCommit,
              this._options?.autoCommit,
              defaults.autoCommit,
            ),
            true,
          ),
      cursor: coerceToBoolean(coalesce(options.cursor, defaults.cursor), false),
      objectRows: coerceToBoolean(
        coalesce(options.objectRows, defaults.objectRows),
        true,
      ),
      ignoreNulls: coerceToBoolean(
        coalesce(options.ignoreNulls, defaults.ignoreNulls),
        false,
      ),
      fetchRows: coerceToInt(
        coalesce(options.fetchRows, defaults.fetchRows),
        100,
      ),
      fieldNaming: coalesce(
        options.namingStrategy,
        defaults.fieldNaming,
      ) as FieldNaming,
      transform: coalesce(options.transform, defaults.transform),
      showSql: coerceToBoolean(
        coalesce(options.showSql, defaults.showSql),
        false,
      ),
      prettyPrint: coerceToBoolean(
        coalesce(options.prettyPrint, defaults.prettyPrint),
        false,
      ),
      action: coerceToString(options.action),
      fetchAsString: options.fetchAsString,
    };
    request.ignoreNulls = request.ignoreNulls && request.objectRows;

    if (query instanceof classes.Query) {
      if (this._intlcon.onGenerateQuery)
        this._intlcon.onGenerateQuery(request, query);
      const q = query.generate({
        dialect: request.dialect,
        dialectVersion: request.dialectVersion,
        params: options.params,
        strictParams: true,
        prettyPrint: request.prettyPrint,
      });
      request.sql = q.sql;
      request.params = q.params;
      request.paramOptions = q.paramOptions;
      if (q.returningFields) request.returningFields = q.returningFields;
      if (query.listenerCount('execute'))
        request.executeHooks = query.listeners(
          'execute',
        ) as ExecuteHookFunction[];
      if (query.listenerCount('fetch'))
        request.fetchHooks = query.listeners('fetch') as FetchFunction[];
    } else {
      // noinspection SuspiciousTypeOfGuard
      if (typeof query === 'string') {
        request.sql = query;
        request.params = options.params;
      }
    }
    // @ts-ignore
    if (!request.sql) throw new Error('No sql given');
    return request;
  }
}
