import { Adapter, DataType, QueryRequest } from '@sqb/connect';
import {
  BindParam,
  Connection,
  DataTypeOIDs,
  FieldInfo,
  OID,
  QueryOptions,
} from 'postgrejs';

const SqbDataTypToOIDMap = {
  [DataType.BOOL]: [DataTypeOIDs.bool, DataTypeOIDs._bool],
  [DataType.CHAR]: [DataTypeOIDs.char, DataTypeOIDs._char],
  [DataType.VARCHAR]: [DataTypeOIDs.varchar, DataTypeOIDs._varchar],
  [DataType.SMALLINT]: [DataTypeOIDs.int2, DataTypeOIDs._int2],
  [DataType.INTEGER]: [DataTypeOIDs.int4, DataTypeOIDs._int4],
  [DataType.BIGINT]: [DataTypeOIDs.int8, DataTypeOIDs._int8],
  [DataType.FLOAT]: [DataTypeOIDs.float4, DataTypeOIDs._float4],
  [DataType.DOUBLE]: [DataTypeOIDs.float8, DataTypeOIDs._float8],
  [DataType.NUMBER]: [DataTypeOIDs.float8, DataTypeOIDs._float8],
  [DataType.DATE]: [DataTypeOIDs.date, DataTypeOIDs._date],
  [DataType.TIMESTAMP]: [DataTypeOIDs.timestamp, DataTypeOIDs._timestamp],
  [DataType.TIMESTAMPTZ]: [DataTypeOIDs.timestamptz, DataTypeOIDs._timestamptz],
  [DataType.TIME]: [DataTypeOIDs.time, DataTypeOIDs._time],
  [DataType.BINARY]: [DataTypeOIDs.bytea, DataTypeOIDs._bytea],
  [DataType.TEXT]: [DataTypeOIDs.text, DataTypeOIDs._text],
  [DataType.GUID]: [DataTypeOIDs.uuid, DataTypeOIDs._uuid],
};

export class PgConnection implements Adapter.Connection {
  private intlcon?: Connection;

  constructor(conn: Connection) {
    this.intlcon = conn;
  }

  get sessionId(): any {
    return this.intlcon && this.intlcon.processID;
  }

  async close() {
    if (!this.intlcon) return;
    await this.intlcon.close(0);
    this.intlcon = undefined;
  }

  async reset() {
    return this.rollback();
  }

  async startTransaction(): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not start transaction for a closed db session');
    await this.intlcon.startTransaction();
  }

  async commit(): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not commit transaction for a closed db session');
    await this.intlcon.commit();
  }

  async rollback(): Promise<void> {
    if (!this.intlcon) return;
    await this.intlcon.rollback();
  }

  async setSavepoint(savepoint: string): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not set savepoint for a closed db session');
    return this.intlcon.savepoint(savepoint);
  }

  async releaseSavepoint(savepoint: string): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not release savepoint for a closed db session');
    return this.intlcon.releaseSavepoint(savepoint);
  }

  async rollbackSavepoint(savepoint: string): Promise<void> {
    if (!this.intlcon)
      throw new Error(
        'Can not rollback to a savepoint for a closed db session',
      );
    return this.intlcon.rollbackToSavepoint(savepoint);
  }

  getInTransaction(): boolean {
    return !!(this.intlcon && this.intlcon.inTransaction);
  }

  async test(): Promise<void> {
    if (!this.intlcon) throw new Error('DB session is closed');
    await this.intlcon.query('select 1');
  }

  async getSchema(): Promise<string> {
    if (!this.intlcon) throw new Error('DB session is closed');
    const r = await this.intlcon.query('SHOW search_path');
    if (r && r.rows && r.rows[0]) return (r.rows as any)[0][0] as string;
    return '';
  }

  async setSchema(schema: string): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not set schema of a closed db session');
    await this.intlcon.execute('SET search_path TO ' + schema);
  }

  onGenerateQuery(request: QueryRequest): void {
    if (this.intlcon) {
      request.dialectVersion = this.intlcon.sessionParameters['server_version'];
    }
  }

  async execute(query: QueryRequest): Promise<Adapter.Response> {
    if (!this.intlcon)
      throw new Error('Can not execute query with a closed db session');

    const params = query.params?.map((v, i) => {
      const paramOpts = Array.isArray(query.paramOptions)
        ? query.paramOptions[i]
        : undefined;
      if (v != null && paramOpts && paramOpts.dataType) {
        const oid =
          SqbDataTypToOIDMap[paramOpts.dataType]?.[paramOpts.isArray ? 1 : 0];
        if (oid) return new BindParam(oid, v);
      }
      return v;
    });

    const opts: QueryOptions = {
      autoCommit: query.autoCommit,
      params,
      cursor: query.cursor,
      fetchCount: query.fetchRows,
      objectRows: query.objectRows,
    };
    if (query.fetchAsString) {
      const items = query.fetchAsString.reduce<OID[]>((a, v) => {
        const oid = SqbDataTypToOIDMap[v][0];
        if (oid) a.push(oid);
        return a;
      }, []);
      if (items.length) opts.fetchAsString = items;
    }
    const resp = await this.intlcon.query(query.sql, opts);
    const out: Adapter.Response = {};
    if (resp.fields) out.fields = this._convertFields(resp.fields);
    if (resp.rows) out.rows = resp.rows;
    if (resp.cursor) out.cursor = resp.cursor;
    if (resp.rowType) out.rowType = resp.rowType;
    if (resp.rowsAffected) out.rowsAffected = resp.rowsAffected;
    return out;
  }

  _convertFields(fields: FieldInfo[]) {
    const result: any[] = [];
    for (let i = 0; i < fields.length; i++) {
      const v = fields[i];
      const o: Adapter.Field = {
        fieldName: v.fieldName,
        dataType: v.dataTypeName,
        elementDataType: v.elementDataTypeName,
        jsType: v.jsType,
        isArray: v.isArray,
        _inf: v,
      };
      result.push(o);
    }
    return result;
  }
}
