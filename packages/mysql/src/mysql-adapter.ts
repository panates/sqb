import '@sqb/mysql-dialect';
import type { Adapter, ClientConfiguration } from '@sqb/connect';
import mysql from 'mysql2/promise';
import { MysqlConnection } from './mysql-connection.js';

export class MysqlAdapter implements Adapter {
  driver = 'mysql2';
  dialect = 'mysql';
  features: Adapter.Features = {
    cursor: true,
    positionalParams: true,
  };

  async connect(config: ClientConfiguration): Promise<Adapter.Connection> {
    const cfg: mysql.ConnectionOptions = { ...config.driverOptions };
    if (config.host) cfg.host = config.host;
    if (config.port) cfg.port = config.port;
    if (config.user) cfg.user = config.user;
    if (config.password) cfg.password = config.password;
    if (config.database) cfg.database = config.database;
    cfg.namedPlaceholders = true;
    cfg.decimalNumbers = true;

    const connection = await mysql.createConnection(cfg);
    return new MysqlConnection(connection);
  }
}
