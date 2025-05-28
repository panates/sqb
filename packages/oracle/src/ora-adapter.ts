import '@sqb/oracle-dialect';
import { Adapter, ClientConfiguration } from '@sqb/connect';
import oracledb from 'oracledb';
import { clientConfigurationToDriver } from './helpers.js';
import { OraConnection } from './ora-connection.js';

export class OraAdapter implements Adapter {
  driver = 'oracledb';
  dialect = 'oracle';
  features = {
    cursor: true,
    schema: true,
    // fetchAsString: [DataType.DATE, DataType.TIMESTAMP, DataType.TIMESTAMPTZ]
  };

  async connect(config: ClientConfiguration): Promise<Adapter.Connection> {
    const cfg = clientConfigurationToDriver(config);
    // Get oracle connection
    const connection = await oracledb.getConnection(cfg);
    try {
      /* Retrieve sessionId */
      let sessionId;
      const r = await connection.execute<any>(
        'select sid from v$mystat where rownum <= 1',
        [],
        {},
      );
      if (r && r.rows) sessionId = r.rows[0][0];

      const oracon = new OraConnection(connection, sessionId);
      /* Set default schema */
      if (config.schema) await oracon.setSchema(config.schema);
      return oracon;
    } catch (e) {
      if (connection) await connection.close();
      throw e;
    }
  }
}
