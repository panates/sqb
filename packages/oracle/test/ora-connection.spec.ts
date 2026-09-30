import type { QueryRequest } from '@sqb/connect';
import { expect } from 'expect';
import type oracledb from 'oracledb';
import { OraConnection } from '../src/ora-connection.js';

describe('oracle:OraConnection', () => {
  describe('serverVersion', () => {
    it('should read serverVersion from oracleServerVersionString, not the encoded oracleServerVersion number', () => {
      // oracleServerVersion (e.g. 1102000400 for 11.2.0.4.0) is a single
      // encoded number, not a dotted string - @sqb/oracle-dialect's
      // pagination logic parses `dialectVersion.split('.')[0]`, so using
      // the raw encoded number here would make every Oracle server (whose
      // encoded number is always >= 12) look like 12c+ regardless of its
      // real version, silently breaking pre-12c OFFSET/FETCH emulation.
      const fakeConn = {
        oracleServerVersion: 1102000400,
        oracleServerVersionString: '11.2.0.4.0',
      } as unknown as oracledb.Connection;

      const connection = new OraConnection(fakeConn, 'sid-1');
      expect(connection.serverVersion).toBe('11.2.0.4.0');

      const request = {} as QueryRequest;
      connection.onGenerateQuery(request);
      expect(request.dialectVersion).toBe('11.2.0.4.0');
    });
  });
});
