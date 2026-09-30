import '@sqb/mariadb-dialect';
import type { Adapter, ClientConfiguration } from '@sqb/connect';
import { type ConnectionConfig, createConnection } from 'mariadb';
import { MariadbConnection } from './mariadb-connection.js';

/**
 * `@sqb/connect` {@link Adapter} for MariaDB, wrapping the `mariadb` npm
 * package. Registered automatically as a side effect of importing this
 * package - see `index.ts`.
 */
export class MariadbAdapter implements Adapter {
  driver = 'mariadb';
  dialect = 'mariadb';
  features: Adapter.Features = {
    cursor: true,
    positionalParams: true,
  };

  /**
   * Opens a new `mariadb` driver connection, configured for named
   * placeholders and JS-`number` results for decimal/bigint/insert-id
   * values (rather than the driver's default of strings/`BigInt`, for
   * result-shape parity with `@sqb/mysql`).
   */
  async connect(config: ClientConfiguration): Promise<Adapter.Connection> {
    const cfg: ConnectionConfig = { ...config.driverOptions };
    if (config.host) cfg.host = config.host;
    if (config.port) cfg.port = config.port;
    if (config.user) cfg.user = config.user;
    if (config.password) cfg.password = config.password;
    if (config.database) cfg.database = config.database;
    cfg.namedPlaceholders = true;
    // Keep numeric/id columns as JS numbers instead of strings/BigInt, to
    // match the convention @sqb/mysql already established for parity across
    // adapters.
    cfg.decimalAsNumber = true;
    cfg.bigIntAsNumber = true;
    cfg.insertIdAsNumber = true;

    const connection = await createConnection(cfg);
    return new MariadbConnection(connection);
  }
}
