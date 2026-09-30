import '@sqb/oracle-dialect';
import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';
import type { Adapter, ClientConfiguration } from '@sqb/connect';
import oracledb from 'oracledb';
import { clientConfigurationToDriver } from './helpers.js';
import { OraConnection } from './ora-connection.js';

/** `@sqb/connect` {@link ClientConfiguration} plus the Oracle-specific driver options `@sqb/oracle` understands. */
export interface OraClientConfiguration extends ClientConfiguration {
  driverOptions?: {
    /** Skips {@link initOracleClient} (locating and loading Oracle's native client libraries) when set, e.g. when the driver's Thin mode is used instead. */
    direct?: boolean;
  };
}

/**
 * `@sqb/connect` {@link Adapter} for Oracle Database, wrapping the
 * `oracledb` npm package. Registered automatically as a side effect of
 * importing this package - see `index.ts`.
 */
export class OraAdapter implements Adapter {
  driver = 'oracledb';
  dialect = 'oracle';
  features: Adapter.Features = {
    cursor: true,
    schema: true,
    // fetchAsString: [DataType.DATE, DataType.TIMESTAMP, DataType.TIMESTAMPTZ]
  };

  /**
   * Opens a new `oracledb` connection (initializing Oracle's native client
   * libraries first, unless `driverOptions.direct` is set), reads back its
   * session id (`v$mystat.sid`) for {@link OraConnection.sessionId}, and
   * switches to `config.schema` if one was given.
   *
   * @throws {Error} whatever the driver throws for a failed connection or schema switch - the connection is closed first if already open
   */
  async connect(config: OraClientConfiguration): Promise<Adapter.Connection> {
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

/**
 * Locates Oracle's native client libraries (`libclntsh.so`/`.dylib`/
 * `oci.dll`, depending on platform) under any directory listed in
 * `LD_LIBRARY_PATH` or `ORA_HOME`, and initializes `oracledb`'s Thick mode
 * with the first one found. A no-op after the first successful call, and
 * a no-op entirely if no matching library is found (leaving the driver in
 * its default Thin mode).
 */
function initOracleClient() {
  if (oracleClientInitialized) return;
  const libDirs = [
    ...(process.env.LD_LIBRARY_PATH?.split(path.delimiter) || []),
    ...(process.env.ORA_HOME?.split(path.delimiter) || []),
  ];
  for (const libDir of libDirs) {
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
      return;
    }
  }
}

initOracleClient();
