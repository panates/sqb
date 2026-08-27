import '@sqb/mssql-dialect';
import type { Adapter, ClientConfiguration } from '@sqb/connect';
import sql from 'mssql';
import { MssqlConnection } from './mssql-connection.js';

export class MssqlAdapter implements Adapter {
  driver = 'mssql';
  dialect = 'mssql';
  features: Adapter.Features = {
    cursor: true,
  };

  async connect(config: ClientConfiguration): Promise<Adapter.Connection> {
    const driverOptions: Record<string, any> = { ...config.driverOptions };
    const cfg: sql.config = {
      server: config.host || 'localhost',
      options: {
        encrypt: driverOptions.encrypt ?? false,
        trustServerCertificate: driverOptions.trustServerCertificate ?? true,
        ...driverOptions.options,
      },
      ...driverOptions,
    };
    if (config.port) cfg.port = config.port;
    if (config.user) cfg.user = config.user;
    if (config.password) cfg.password = config.password;
    if (config.database) cfg.database = config.database;

    const pool = new sql.ConnectionPool(cfg);
    await pool.connect();
    return new MssqlConnection(pool);
  }
}
