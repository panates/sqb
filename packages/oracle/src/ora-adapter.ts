import '@sqb/oracle-dialect';
import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';
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
    if (!config.driverOptions?.direct) initOracleClient();
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

let oracleClientInitialized = false;
function initOracleClient() {
  if (oracleClientInitialized) return;
  const libDirs = process.env.LD_LIBRARY_PATH || process.env.ORA_HOME;
  if (libDirs) {
    for (const libDir of libDirs.split(':')) {
      if (
        (os.type() === 'Linux' &&
          fs.existsSync(path.join(libDir, 'libclntsh.so'))) ||
        (os.type() === 'Darwin' &&
          fs.existsSync(path.join(libDir, 'libclntsh.dylib'))) ||
        (os.type() === 'Windows_NT' &&
          fs.existsSync(path.join(libDir, 'oci.dll')))
      ) {
        oracledb.initOracleClient({ libDir });
        oracleClientInitialized = true;
      }
    }
  }
}
