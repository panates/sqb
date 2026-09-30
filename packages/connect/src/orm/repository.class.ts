import { LogicalOperator, type TableName } from '@sqb/builder';
import { AsyncEventEmitter, TypedEventEmitterClass } from 'strict-typed-events';
import type {
  PartialDTO,
  PatchDTO,
  RequiredSome,
  StrictOmit,
  Type,
} from 'ts-gems';
import { FieldInfoMap } from '../client/field-info-map.js';
import type { SqbClient } from '../client/sqb-client.js';
import type { SqbConnection } from '../client/sqb-connection.js';
import type { QueryRequest, TransactionFunction } from '../client/types.js';
import { CountCommand } from './commands/count.command.js';
import { CreateCommand } from './commands/create.command.js';
import { DeleteCommand } from './commands/delete.command.js';
import { FindCommand } from './commands/find.command.js';
import { UpdateCommand } from './commands/update.command.js';
import { EntityMetadata } from './model/entity-metadata.js';
import { extractKeyValues } from './util/extract-keyvalues.js';

/** Options controlling which fields a `create`/`find`/`update` operation returns. */
interface Projection {
  /** Fields to include (or, prefixed with `-`, exclude) in the result - see `parseFieldsProjection`. */
  projection?: string | string[];
}

/** Options controlling which rows an operation applies to. */
interface Filtering {
  /** Condition(s) narrowing which rows the operation applies to (a `@sqb/builder` operator, or a plain object condition). */
  filter?: LogicalOperator | LogicalOperator[] | object | object[];
  /** Bind parameter values for `filter`. */
  params?: any;
}

/** Namespace of option types accepted by {@link Repository}'s methods. */
export namespace Repository {
  /** Callback invoked once per raw result row as `FindCommand` converts it into an output object, letting a caller observe (not modify) the raw row alongside the converted one. */
  export type TransformRowFunction = (
    fields: FieldInfoMap,
    row: object,
    obj: object,
  ) => void;

  /** Options shared by every {@link Repository} command. */
  export interface CommandOptions {
    /** Runs the command on this connection instead of acquiring a new one from the client (and, if given, doesn't release it afterward). */
    connection?: SqbConnection;
    /** Formats the generated SQL across multiple indented lines instead of a single compact line. */
    prettyPrint?: boolean;
    /** SQL comment(s) to attach to the generated query. */
    comment?:
      | string
      | string[]
      | {
          comment: string;
          dialect?: string[];
        }
      | {
          comment: string;
          dialect?: string[];
        }[];
    /** Dialect-specific optimizer hint(s) to attach to the generated query's table reference. */
    optimizerHint?:
      string | string[] | TableName.OptimizerHint | TableName.OptimizerHint[];
  }

  /** Options for {@link Repository.create}/{@link Repository.createOnly}. */
  export interface CreateOptions extends CommandOptions, Projection {}

  /** Options for {@link Repository.count}. */
  export interface CountOptions extends CommandOptions, Filtering {}

  /** Options for {@link Repository.exists}/{@link Repository.existsOne}. */
  export interface ExistsOptions extends CommandOptions, Filtering {}

  /** Options for {@link Repository.delete}. */
  export interface DeleteOptions extends CommandOptions, Filtering {}

  /** Options for {@link Repository.deleteMany}. */
  export interface DeleteManyOptions extends CommandOptions, Filtering {}

  /** Options for {@link Repository.findById}. */
  export interface FindOptions extends CommandOptions, Projection, Filtering {}

  /** Options for {@link Repository.findOne}. */
  export interface FindOneOptions extends FindOptions {
    /** Column(s) to sort by (a leading `-` sorts descending); see `Select.orderBy`. */
    sort?: string[];
    /** Number of matching rows to skip before returning results. */
    offset?: number;
  }

  /** Options for {@link Repository.findMany}. */
  export interface FindManyOptions extends FindOneOptions {
    /** Maximum number of rows to return. */
    limit?: number;
    /** Adds `DISTINCT` to the generated query. */
    distinct?: boolean;
    /** Caps how many rows a to-many eager-loaded association may fetch before throwing, per parent row batch (default: 100000). */
    maxEagerFetch?: number;
    /** Caps how many levels of to-many eager-loaded associations are followed (default: 5); deeper associations are simply omitted rather than erroring. */
    maxSubQueries?: number;
    /** Observes each raw row alongside its converted output object. */
    onTransformRow?: TransformRowFunction;
  }

  /** Options for {@link Repository.update}. */
  export interface UpdateOptions
    extends CommandOptions, Projection, Filtering {}

  /** Options for {@link Repository.updateOnly}. */
  export interface UpdateOnlyOptions extends CommandOptions, Filtering {}

  /** Options for {@link Repository.updateMany}. */
  export interface UpdateManyOptions extends CommandOptions, Filtering {}
}

/** Events emitted by a {@link Repository}. */
interface RepositoryEvents {
  /** Emitted whenever this repository executes a query. */
  execute: (request: QueryRequest) => void;
  /** Emitted when a command fails. */
  error: (error: Error) => void;
  /** Emitted whenever this repository acquires a connection (only relevant when constructed with an `SqbClient`, not a fixed `SqbConnection`). */
  acquire: (connection: SqbConnection) => Promise<void>;
}

/**
 * A high-level CRUD interface over one `@Entity`-decorated class - the
 * primary way application code reads and writes entity rows, obtained via
 * `SqbClient.getRepository(...)`/`SqbConnection.getRepository(...)` rather
 * than constructed directly.
 *
 * Every method here handles its own connection acquisition/release when
 * constructed with an `SqbClient` (or reuses a fixed `SqbConnection`/
 * per-call `options.connection` when given one), and translates entity-level
 * concepts (projections, filters, associations) into `@sqb/builder` queries
 * executed through `FindCommand`/`CreateCommand`/`UpdateCommand`/`DeleteCommand`/
 * `CountCommand`.
 *
 * @template T - The entity class type this repository operates on.
 */
export class Repository<T> extends TypedEventEmitterClass<RepositoryEvents>(
  AsyncEventEmitter,
) {
  private readonly _executor: SqbClient | SqbConnection;
  private readonly _entity: EntityMetadata;
  private readonly _schema?: string;

  /**
   * @param entityDef - The entity this repository operates on.
   * @param executor - Either a pooled `SqbClient` (each command acquires and releases its own connection) or a fixed `SqbConnection` (every command shares it, and thus any open transaction).
   * @param schema - Overrides the schema this repository's queries run against.
   */
  constructor(
    entityDef: EntityMetadata,
    executor: SqbClient | SqbConnection,
    schema?: string,
  ) {
    super();
    this._executor = executor;
    this._entity = entityDef;
    this._schema = schema;
  }

  /** The entity metadata this repository operates on. */
  get entity(): EntityMetadata {
    return this._entity;
  }

  /** The entity class this repository operates on. */
  get type(): Type<T> {
    return this._entity.ctor;
  }

  /**
   * Creates a new resource
   *
   * @param {PartialDTO<T>} input - The input data
   * @param {Repository.CreateOptions} [options] - The options object
   * @returns {Promise<PartialDTO<T>>} A promise that resolves to the created resource
   * @throws {Error} if an unknown error occurs while creating the resource
   */
  create(
    input: PartialDTO<T>,
    options: RequiredSome<Repository.CreateOptions, 'projection'>,
  ): Promise<PartialDTO<T>>;
  create(input: PartialDTO<T>, options?: Repository.CreateOptions): Promise<T>;
  create(
    input: PartialDTO<T>,
    options?: Repository.CreateOptions,
  ): Promise<PartialDTO<T> | T> {
    return this._execute(async connection => {
      const keyValue = await this._create(input, {
        ...options,
        connection,
        returning: true,
      });
      const result =
        keyValue && (await this._find(keyValue, { ...options, connection }));
      if (!result) throw new Error('Unable to insert new row');
      return result;
    }, options);
  }

  /**
   * Creates a new resource but returns nothing
   *
   * @param {PartialDTO<T>} input - The input data
   * @param {Repository.CreateOptions} [options] - The options object
   * @returns {Promise<any>} A promise that resolves key value(s) of the created record
   * @throws {Error} if an unknown error occurs while creating the resource
   */
  createOnly(
    input: PartialDTO<T>,
    options?: StrictOmit<Repository.CreateOptions, keyof Projection>,
  ): Promise<any> {
    return this._execute(async connection => {
      const r = await this._create(input, {
        ...options,
        connection,
        returning: true,
      });
      const primaryIndex = EntityMetadata.getPrimaryIndex(this.entity);
      if (!primaryIndex || primaryIndex.columns.length > 1) return r;
      return r[primaryIndex.columns[0]];
    }, options);
  }

  /**
   * Returns the count of records based on the provided options
   *
   * @param {Repository.CountOptions} options - The options for the count operation.
   * @return {Promise<number>} - A promise that resolves to the count of records
   */
  count(options?: Repository.CountOptions): Promise<number> {
    return this._execute(
      async connection => this._count({ ...options, connection }),
      options,
    );
  }

  /**
   * Deletes a record from the collection.
   *
   * @param {any} keyValue - The ID of the resource to delete.
   * @param {Repository.DeleteOptions} [options] - Optional delete options.
   * @return {Promise<boolean>} - A Promise that resolves true or false. True when resource deleted.
   */
  delete(
    keyValue: any | Record<string, any>,
    options?: Repository.DeleteOptions,
  ): Promise<boolean> {
    return this._execute(
      async connection => this._delete(keyValue, { ...options, connection }),
      options,
    );
  }

  /**
   * Deletes multiple documents from the collection that meet the specified filter criteria.
   *
   * @param {Repository.DeleteManyOptions} options - The options for the delete operation.
   * @return {Promise<number>} - A promise that resolves to the number of resources deleted.
   */
  deleteMany(options?: Repository.DeleteManyOptions): Promise<number> {
    return this._execute(
      async connection => this._deleteMany({ ...options, connection }),
      options,
    );
  }

  /**
   * Checks if a record with the given id exists.
   *
   * @param {any} keyValue - The id of the object to check.
   * @param {Repository.ExistsOptions} [options] - The options for the query (optional).
   * @return {Promise<boolean>} - A Promise that resolves to a boolean indicating whether the record exists or not.
   */
  exists(
    keyValue: any | Record<string, any>,
    options?: Repository.ExistsOptions,
  ): Promise<boolean> {
    return this._execute(
      async connection => this._exists(keyValue, { ...options, connection }),
      options,
    );
  }

  /**
   * Checks if a record with the given arguments exists.
   *
   * @param {Repository.ExistsOptions} [options] - The options for the query (optional).
   * @return {Promise<boolean>} - A Promise that resolves to a boolean indicating whether the record exists or not.
   */
  existsOne(options?: Repository.ExistsOptions): Promise<boolean> {
    return this._execute(
      async connection => this._existsOne({ ...options, connection }),
      options,
    );
  }

  /**
   * Finds a record by ID.
   *
   * @param {any} keyValue - The ID of the record.
   * @param {Repository.FindOneOptions} [options] - The options for the find query.
   * @return {Promise<PartialDTO<T | undefined>>} - A promise resolving to the found document, or undefined if not found.
   */
  findById(
    keyValue: any | Record<string, any>,
    options: RequiredSome<Repository.FindOptions, 'projection'>,
  ): Promise<PartialDTO<T> | undefined>;
  findById(
    keyValue: any | Record<string, any>,
    options?: Repository.FindOptions,
  ): Promise<T | undefined>;
  findById(
    keyValue: any | Record<string, any>,
    options?: Repository.FindOptions,
  ): Promise<PartialDTO<T> | T | undefined> {
    return this._execute(
      async connection => this._find(keyValue, { ...options, connection }),
      options,
    );
  }

  /**
   * Finds a record in the collection that matches the specified options.
   *
   * @param {Repository.FindOneOptions} options - The options for the query.
   * @return {Promise<PartialDTO<T> | undefined>} A promise that resolves with the found document or undefined if no document is found.
   */
  findOne(
    options: RequiredSome<Repository.FindOneOptions, 'projection'>,
  ): Promise<PartialDTO<T> | undefined>;
  findOne(options?: Repository.FindOneOptions): Promise<T | undefined>;
  findOne(
    options?: Repository.FindOneOptions,
  ): Promise<PartialDTO<T> | T | undefined> {
    return this._execute(
      async connection =>
        await this._findOne({
          ...options,
          connection,
        }),
      options,
    );
  }

  /**
   * Finds multiple records in collection.
   *
   * @param {Repository.FindManyOptions} options - The options for the find operation.
   * @return A Promise that resolves to an array of partial outputs of type T.
   */
  findMany(
    options: RequiredSome<Repository.FindManyOptions, 'projection'>,
  ): Promise<PartialDTO<T>[]>;
  findMany(options?: Repository.FindManyOptions): Promise<T[]>;
  findMany(
    options?: Repository.FindManyOptions,
  ): Promise<(PartialDTO<T> | T)[]> {
    return this._execute(
      async connection => this._findMany({ ...options, connection }),
      options,
    );
  }

  /**
   * Updates a record with the given id in the collection.
   *
   * @param {any} keyValue - The id of the document to update.
   * @param {PatchDTO<T>} input - The partial input object containing the fields to update.
   * @param {Repository.UpdateOptions} [options] - The options for the update operation.
   * @returns {Promise<PartialDTO<T> | undefined>} A promise that resolves to the updated document or
   * undefined if the document was not found.
   */
  update(
    keyValue: any | Record<string, any>,
    input: PatchDTO<T>,
    options: RequiredSome<Repository.UpdateOptions, 'projection'>,
  ): Promise<PartialDTO<T> | undefined>;
  update(
    keyValue: any | Record<string, any>,
    input: PatchDTO<T>,
    options?: Repository.UpdateOptions,
  ): Promise<T | undefined>;
  update(
    keyValue: any | Record<string, any>,
    input: PatchDTO<T>,
    options?: Repository.UpdateOptions,
  ): Promise<PartialDTO<T> | T | undefined> {
    return this._execute(async connection => {
      const opts = { ...options, connection };
      const keyValues = await this._update(keyValue, input, opts);
      if (keyValues) return this._find(keyValues, opts);
    }, options);
  }

  /**
   * Updates a record in the collection with the specified ID and returns updated record count
   *
   * @param {any} keyValue - The ID of the document to update.
   * @param {PatchDTO<T>} input - The partial input data to update the document with.
   * @param {Repository.UpdateOptions} options - The options for updating the document.
   * @returns {Promise<number>} - A Promise that resolves true or false. True when resource updated.
   */
  updateOnly(
    keyValue: any | Record<string, any>,
    input: PatchDTO<T>,
    options?: Repository.UpdateOnlyOptions,
  ): Promise<boolean> {
    return this._execute(
      async connection =>
        !!(await this._update(keyValue, input, { ...options, connection })),
      options,
    );
  }

  /**
   * Updates multiple records in the collection based on the specified input and options.
   *
   * @param {PatchDTO<T>} input - The partial input to update the documents with.
   * @param {Repository.UpdateManyOptions} options - The options for updating the documents.
   * @return {Promise<number>} - A promise that resolves to the number of documents matched and modified.
   */
  updateMany(
    input: PartialDTO<T>,
    options?: Repository.UpdateManyOptions,
  ): Promise<number> {
    return this._execute(async connection =>
      this._updateMany(input, { ...options, connection }),
    );
  }

  /**
   * Runs `fn` with a connection: `opts.connection` if given, else this
   * repository's own fixed connection (if constructed with one), else a
   * freshly acquired-and-auto-released connection from the client. Applies
   * `this._schema` to the connection before calling `fn`, and emits
   * `'acquire'` when a new connection was acquired.
   */
  protected async _execute(
    fn: TransactionFunction,
    opts?: Repository.CommandOptions,
  ): Promise<any> {
    let connection = opts?.connection;
    const { SqbConnection } = await import('../client/sqb-connection.js');
    if (!connection && this._executor instanceof SqbConnection)
      connection = this._executor;
    if (connection) {
      if (this._schema) await connection.setSchema(this._schema);
      return fn(connection);
    }
    return (this._executor as SqbClient).acquire(async conn => {
      if (this._schema) await conn.setSchema(this._schema);
      await this.emitAsyncSerial('acquire', conn);
      return fn(conn);
    });
  }

  /** Inserts a new row via `CreateCommand`, returning its primary key value(s) when `options.returning` is set. */
  protected async _create(
    values: PartialDTO<T>,
    options: Repository.CreateOptions & {
      connection: SqbConnection;
      returning?: boolean;
    },
  ): Promise<any> {
    if (!values) throw new TypeError('You must provide values');
    const keyValues = await CreateCommand.execute({
      ...options,
      entity: this._entity,
      values,
    });
    if (options.returning && !keyValues)
      throw new Error('Unable to insert new row');
    return keyValues;
  }

  /** Checks whether a row matching `keyValue` (plus any `options.filter`) exists. */
  protected async _exists(
    keyValue: any | Record<string, any>,
    options: Repository.ExistsOptions & {
      connection: SqbConnection;
    },
  ): Promise<boolean> {
    const filter = [extractKeyValues(this._entity, keyValue, true)];
    if (options && options.filter) {
      if (Array.isArray(options.filter)) filter.push(...options.filter);
      else filter.push(options.filter);
    }
    return this._existsOne({
      ...options,
      filter,
    });
  }

  /** Checks whether any row matching `options.filter` exists, via `FindCommand` (limited to one row). */
  protected async _existsOne(
    options: Repository.ExistsOptions & {
      connection: SqbConnection;
    },
  ): Promise<boolean> {
    const filter: any[] = [];
    if (options && options.filter) {
      if (Array.isArray(options.filter)) filter.push(...options.filter);
      else filter.push(options.filter);
    }
    const resp = await FindCommand.execute({
      ...options,
      filter,
      entity: this._entity,
    });
    return resp.length > 0;
  }

  /** Counts rows matching `options.filter`, via `CountCommand`. */
  protected async _count(
    options: Repository.CountOptions & { connection: SqbConnection },
  ): Promise<number> {
    return CountCommand.execute({
      ...options,
      entity: this._entity,
    });
  }

  /** Runs a find query via `FindCommand`, returning all matching (converted) rows. */
  protected async _findMany(
    options: Repository.FindManyOptions & {
      connection: SqbConnection;
    },
  ): Promise<PartialDTO<T>[]> {
    return await FindCommand.execute({
      ...options,
      entity: this._entity,
    });
  }

  /** Runs {@link Repository._findMany} limited to one row, returning it (or `undefined`). */
  protected async _findOne(
    options: Repository.FindOneOptions & {
      connection: SqbConnection;
    },
  ): Promise<PartialDTO<T> | undefined> {
    const rows = await this._findMany({
      ...options,
      limit: 1,
    });
    return rows && rows[0];
  }

  /** Finds the single row matching `keyValue` (plus any `options.filter`). */
  protected async _find(
    keyValue: any | Record<string, any>,
    options: Repository.FindOptions & {
      connection: SqbConnection;
    },
  ): Promise<PartialDTO<T> | undefined> {
    const filter = [extractKeyValues(this._entity, keyValue, true)];
    if (options && options.filter) {
      if (Array.isArray(options.filter)) filter.push(...options.filter);
      else filter.push(options.filter);
    }
    return await this._findOne({ ...options, filter, offset: 0 });
  }

  /** Deletes the single row matching `keyValue` (plus any `options.filter`), via `DeleteCommand`. */
  protected async _delete(
    keyValue: any | Record<string, any>,
    options: Repository.DeleteOptions & {
      connection: SqbConnection;
    },
  ): Promise<boolean> {
    const filter = [extractKeyValues(this._entity, keyValue, true)];
    if (options && options.filter) {
      if (Array.isArray(options.filter)) filter.push(...options.filter);
      else filter.push(options.filter);
    }
    return !!(await DeleteCommand.execute({
      ...options,
      filter,
      entity: this._entity,
    }));
  }

  /** Deletes every row matching `options.filter`, via `DeleteCommand`. */
  protected async _deleteMany(
    options: Repository.DeleteManyOptions & {
      connection: SqbConnection;
    },
  ): Promise<number> {
    return DeleteCommand.execute({
      ...options,
      entity: this._entity,
      filter: options?.filter,
      params: options?.params,
    });
  }

  /** Updates the single row matching `keyValue` (plus any `options.filter`), via `UpdateCommand`; returns the row's key values if a row was actually updated. */
  protected async _update(
    keyValue: any | Record<string, any>,
    values: PatchDTO<T>,
    options: Repository.UpdateOptions & {
      connection: SqbConnection;
    },
  ): Promise<Record<string, any> | undefined> {
    if (!values) throw new TypeError('You must provide values');
    const keyValues = extractKeyValues(this._entity, keyValue, true);
    const filter = [keyValues];
    if (options.filter) {
      if (Array.isArray(options.filter)) filter.push(...options.filter);
      else filter.push(options.filter);
    }
    const updateValues = { ...values };
    Object.keys(keyValues).forEach(k => delete updateValues[k]);
    const rowsAffected = await UpdateCommand.execute({
      ...options,
      entity: this._entity,
      values: updateValues,
      filter,
    });
    return rowsAffected ? keyValues : undefined;
  }

  /** Updates every row matching `options.filter`, via `UpdateCommand`. */
  protected async _updateMany(
    values: PartialDTO<T>,
    options: Repository.UpdateManyOptions & {
      connection: SqbConnection;
    },
  ): Promise<number> {
    if (!values) throw new TypeError('You must provide values');
    return await UpdateCommand.execute({
      ...options,
      entity: this._entity,
      values,
    });
  }
}
