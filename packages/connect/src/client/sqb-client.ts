import { classes } from '@sqb/builder';
import _debug from 'debug';
import {
  createPool,
  Pool as LightningPool,
  PoolConfiguration,
  PoolFactory,
  PoolState,
} from 'lightning-pool';
import { coerceToBoolean, coerceToInt } from 'putil-varhelpers';
import { AsyncEventEmitter, TypedEventEmitterClass } from 'strict-typed-events';
import { Maybe, Type } from 'ts-gems';
import { EntityMetadata } from '../orm/model/entity-metadata.js';
import { Repository } from '../orm/repository.class.js';
import { Adapter } from './adapter.js';
import { AdapterRegistry } from './extensions.js';
import { SqbConnection } from './sqb-connection.js';
import {
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

interface SqbClientEvents {
  execute: (request: QueryRequest) => void;
  error: (error: Error) => void;
  closing: () => void;
  close: () => void;
  acquire: (connection: SqbConnection) => Promise<void>;
  terminate: () => void;
  'connection-return': (connection: SqbConnection) => Promise<void>;
}

export class SqbClient extends TypedEventEmitterClass<SqbClientEvents>(
  AsyncEventEmitter,
) {
  private readonly _adapter: Adapter;
  private readonly _pool: LightningPool<Adapter.Connection>;
  private readonly _defaults: ClientDefaults;
  private readonly _entities: Record<string, Type> = {};

  constructor(config: ClientConfiguration) {
    super();
    if (!(config && typeof config === 'object'))
      throw new TypeError('Configuration object required');

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

  get pool(): LightningPool {
    return this._pool;
  }

  /**
   * Obtains a connection from the connection pool and executes the callback
   */
  async acquire(
    fn: TransactionFunction,
    options?: ConnectionOptions,
  ): Promise<any>;
  /**
   * Obtains a connection from the connection pool.
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
   */
  async close(terminateWait?: number): Promise<void> {
    const ms = terminateWait == null ? Infinity : 0;
    return this._pool.close(ms);
  }

  /**
   * Executes a query or callback with a new acquired connection.
   */
  async execute(
    query: string | classes.Query,
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
