import '@sqb/postgres-dialect';
import { type Adapter, type ClientConfiguration, DataType } from '@sqb/connect';
import { Connection, type ConnectionConfiguration } from 'postgrejs';
import { PgConnection } from './pg-connection.js';

/**
 * `@sqb/connect` {@link Adapter} for PostgreSQL, wrapping the `postgrejs`
 * npm package. Registered automatically as a side effect of importing
 * this package - see `index.ts`.
 */
export class PgAdapter implements Adapter {
  driver = 'postgrejs';
  dialect = 'postgres';
  features: Adapter.Features = {
    cursor: true,
    schema: true,
    fetchAsString: [DataType.DATE, DataType.TIMESTAMP, DataType.TIMESTAMPTZ],
    positionalParams: true,
  };

  /**
   * Opens a new `postgrejs` connection.
   *
   * @throws {Error} whatever the driver throws for a failed connection - the connection is closed first if already open
   */
  async connect(config: ClientConfiguration): Promise<Adapter.Connection> {
    const cfg: ConnectionConfiguration = { ...config.driverOptions };
    if (config.user) cfg.user = config.user;
    if (config.password) cfg.password = config.password;
    if (config.host) cfg.host = config.host;
    if (config.port) cfg.port = config.port;
    if (config.database) cfg.database = config.database;
    if (config.schema) cfg.schema = config.schema;

    const connection = new Connection(cfg);
    try {
      await connection.connect();
      return new PgConnection(connection);
    } catch (e) {
      await connection.close(0);
      throw e;
    }
  }
}
