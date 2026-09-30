import type { Query } from '@sqb/builder';
import _debug from 'debug';
import {
  createPool,
  Pool as LightningPool,
  type PoolConfiguration,
  type PoolFactory,
  PoolState,
} from 'lightning-pool';
import { coerceToBoolean, coerceToInt } from 'putil-varhelpers';
import { AsyncEventEmitter, TypedEventEmitterClass } from 'strict-typed-events';
import type { Maybe, Type } from 'ts-gems';
import { EntityMetadata } from '../orm/model/entity-metadata.js';
import { Repository } from '../orm/repository.class.js';
import type { Adapter } from './adapter.js';
import { AdapterRegistry } from './extensions.js';
import { SqbConnection } from './sqb-connection.js';
import type {
  ClientConfiguration,
  ClientDefaults,
  ConnectionOptions,
  QueryExecuteOptions,
  QueryRequest,
  QueryResult,
  TransactionFunction,
} from './types.js';

const debug = _debug('sqb:client');
const inspect = Symbol.for('nodejs.util.inspect.custom');

/** Events emitted by a {@link SqbClient}. */
interface SqbClientEvents {
  /** Emitted whenever any connection acquired from this client executes a query. */
  execute: (request: QueryRequest) => void;
  /** Emitted when the underlying pool (or a connection acquired from it) reports an error. */
  error: (error: Error) => void;
  /** Emitted when the pool starts shutting down (`close()` was called, before it finishes). */
  closing: () => void;
  /** Emitted once the pool has fully shut down. */
  close: () => void;
  /** Emitted whenever a connection is acquired, awaited before the connection is handed to the caller - lets listeners run setup (e.g. `SET search_path`) on every acquired connection. */
  acquire: (connection: SqbConnection) => Promise<void>;
  /** Emitted if pooled resources have to be force-terminated during shutdown. */
  terminate: () => void;
  /** Emitted when an acquired connection is returned to the pool. */
  'connection-return': (connection: SqbConnection) => Promise<void>;
}

/**
 * A pooled database client: the main entry point for connecting to a
 * database with `@sqb/connect`. Wraps a `lightning-pool` connection pool
 * around the {@link Adapter} resolved from `config.driver`/`config.dialect`,
 * and exposes both direct query execution (`execute()`) and repository-based
 * ORM access (`getRepository()`) built on top of it.
 *
 * Every connection obtained via `acquire()`/`execute()` ultimately comes
 * from this pool - closing the client (`close()`) tears the whole pool down.
 */
export class SqbClient extends TypedEventEmitterClass<SqbClientEvents>(
  AsyncEventEmitter,
) {
  private readonly _adapter: Adapter;
  private readonly _pool: LightningPool<Adapter.Connection>;
  private readonly _defaults: ClientDefaults;
  private readonly _entities: Record<string, Type> = {};
  /** The configuration this client was constructed with. */
  readonly config: ClientConfiguration;

  /**
   * @param config - Identifies the target database/driver and configures pooling and default query behavior.
   * @throws {TypeError} If `config` isn't an object.
   * @throws {Error} If neither `config.driver` nor `config.dialect` resolves to a registered {@link Adapter} (the corresponding driver package must be imported first, so it registers itself), or if neither property is given at all.
   */
  constructor(config: ClientConfiguration) {
    super();
    if (!(config && typeof config === 'object'))
      throw new TypeError('Configuration object required');

    this.config = config;
    let adapter;
    if (config.driver) {
      adapter = AdapterRegistry.findDriver(config.driver);
      if (!adapter)
        throw new Error(
          `No database adapter registered for "${config.driver}" driver`,
        );
    } else if (config.dialect) {
      adapter = AdapterRegistry.findDialect(config.dialect);
      if (!adapter)
        throw new Error(
          `No database adapter registered for "${config.dialect}" dialect`,
        );
    }
    if (!adapter)
      throw new Error(
        `You must provide one of "driver" or "dialect" properties`,
      );

    this._adapter = adapter;

    this._defaults = config.defaults || {};

    const poolOptions: PoolConfiguration = {};
    const popts = config.pool || {};
    poolOptions.acquireMaxRetries = coerceToInt(popts.acquireMaxRetries, 0);
    poolOptions.acquireRetryWait = coerceToInt(popts.acquireRetryWait, 2000);
    poolOptions.acquireTimeoutMillis = coerceToInt(
      popts.acquireTimeoutMillis,
      0,
    );
    poolOptions.idleTimeoutMillis = coerceToInt(popts.idleTimeoutMillis, 30000);
    poolOptions.max = coerceToInt(popts.max, 10);
    poolOptions.maxQueue = coerceToInt(popts.maxQueue, 1000);
    poolOptions.max = coerceToInt(popts.max, 10);
    poolOptions.min = coerceToInt(popts.min, 0);
    poolOptions.minIdle = coerceToInt(popts.minIdle, 0);
    poolOptions.validation = coerceToBoolean(popts.validation, false);

    const cfg = { ...config };
    const poolFactory: PoolFactory<Adapter.Connection> = {
      create: () => adapter.connect(cfg),
      destroy: instance => instance.close(),
      reset: async instance => instance.reset(),
      validate: instance => instance.test(),
    };

    this._pool = createPool<Adapter.Connection>(poolFactory, poolOptions);
    this._pool.on('closing', () => this.emit('closing'));
    this._pool.on('close', () => this.emit('close'));
    this._pool.on('terminate', () => this.emit('terminate'));
    // @ts-ignore
    this._pool.on('error', (...args: any[]) => this.emit('error', ...args));
  }

  /** Default query-execution behavior for connections acquired from this client (from `config.defaults`). */
  get defaults(): ClientDefaults {
    return this._defaults;
  }

  /**
   * Returns dialect
   */
  get dialect() {
    return this._adapter.dialect;
  }

  /**
   * Returns database driver name
   */
  get driver() {
    return this._adapter.driver;
  }

  /**
   * Returns true if pool is closed
   */
  get isClosed() {
    return this._pool.state === PoolState.CLOSED;
  }

  /** The underlying `lightning-pool` connection pool. */
  get pool(): LightningPool {
    return this._pool;
  }

  /**
   * Obtains a connection from the connection pool, passes it to `fn`, and
   * releases it automatically once `fn` settles (even if it throws).
   *
   * @param fn - Callback receiving the acquired connection; its return value becomes this call's result.
   * @param options - Connection options (e.g. `autoCommit`).
   */
  async acquire(
    fn: TransactionFunction,
    options?: ConnectionOptions,
  ): Promise<any>;
  /**
   * Obtains a connection from the connection pool. The caller is
   * responsible for calling `connection.release()` when done - prefer the
   * `acquire(fn)` overload where possible, which releases automatically.
   *
   * @param options - Connection options (e.g. `autoCommit`).
   */
  async acquire(options?: ConnectionOptions): Promise<SqbConnection>;
  async acquire(arg0?: any, arg1?: any): Promise<any> {
    debug('acquire');
    if (typeof arg0 === 'function') {
      const connection = await this.acquire(arg1 as ConnectionOptions);
      try {
        return await arg0(connection);
      } finally {
        connection.release();
      }
    }
    const options = arg1 as ConnectionOptions;
    const adapterConnection = await this._pool.acquire();
    const opts = { autoCommit: this.defaults.autoCommit, ...options };
    const connection = new SqbConnection(this, adapterConnection, opts);
    await this.emitAsyncSerial('acquire', connection);
    connection.on('execute', (request: QueryRequest) =>
      this.emit('execute', request),
    );
    connection.on('error', (error: Error) => this.emit('error', error));
    connection.on('close', () =>
      this.emitAsyncSerial('connection-return', connection),
    );
    return connection;
  }

  /**
   * Shuts down the pool and destroys all resources.
   *
   * @param terminateWait - Milliseconds to wait for in-use connections to be released before force-terminating them; omitted waits indefinitely.
   */
  async close(terminateWait?: number): Promise<void> {
    return this._pool.closeAsync(terminateWait);
  }

  /**
   * Acquires a connection, executes one query on it, and releases the
   * connection - unless the query was run in cursor mode, in which case the
   * connection is retained until the returned cursor is closed.
   *
   * @param query - A raw SQL string, or a `@sqb/builder` query.
   * @param options - Execution options (params, `cursor`, `autoCommit`, etc.).
   */
  async execute(
    query: string | Query,
    options?: QueryExecuteOptions,
  ): Promise<QueryResult> {
    debug('execute');
    const connection = await this.acquire();
    try {
      const qr = await connection.execute(query, options);
      if (qr && qr.cursor) {
        connection.retain();
        qr.cursor.once('close', () => connection.release());
      }
      return qr;
    } finally {
      connection.release();
    }
  }

  /**
   * Tests the pool
   */
  async test(): Promise<void> {
    const connection = await this.acquire();
    try {
      await connection.test();
    } finally {
      connection.release();
    }
  }

  /**
   * Creates a {@link Repository} for the given `@Entity`-decorated class,
   * backed by this client's connection pool (each repository call acquires
   * and releases its own connection).
   *
   * @param entity - An `@Entity`-decorated class, or the name of one previously registered via {@link SqbClient.getEntity}'s backing map.
   * @param opts - `schema` overrides the schema this repository's queries run against.
   * @throws {Error} If `entity` is a name that isn't registered, or resolves to a class without `@Entity` metadata.
   */
  getRepository<T>(
    entity: Type<T> | string,
    opts?: { schema?: string },
  ): Repository<T> {
    let ctor;
    if (typeof entity === 'string') {
      ctor = this.getEntity<T>(entity);
      if (!ctor) throw new Error(`Repository "${entity}" is not registered`);
    } else ctor = entity;
    const entityDef = EntityMetadata.get(ctor);
    if (!entityDef)
      throw new Error(`You must provide an @Entity annotated constructor`);
    return new Repository<T>(entityDef, this, opts?.schema);
  }

  /** Looks up a previously registered named entity class, or `undefined` if none is registered under that name. */
  getEntity<T>(name: string): Maybe<Type<T>> {
    return this._entities[name] as Type<T>;
  }

  toString() {
    return (
      '[object ' +
      Object.getPrototypeOf(this).constructor.name +
      '(' +
      this.dialect +
      ')]'
    );
  }

  [inspect]() {
    return this.toString();
  }
}
