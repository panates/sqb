import '@sqb/postgres-dialect';
import { Adapter, ClientConfiguration, DataType } from '@sqb/connect';
import { Connection, ConnectionConfiguration } from 'postgrejs';
import { PgConnection } from './pg-connection.js';

export class PgAdapter implements Adapter {
  driver = 'postgrejs';
  dialect = 'postgres';
  features = {
    cursor: true,
    schema: true,
    fetchAsString: [DataType.DATE, DataType.TIMESTAMP, DataType.TIMESTAMPTZ],
  };

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
