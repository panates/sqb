import { Adapter, RowType } from '@sqb/connect';
import { ResultSet } from 'oracledb';

export class OraCursor implements Adapter.Cursor {
  private _resultSet?: ResultSet<any>;
  private readonly _rowType: RowType;
  private readonly _rowNumberIdx?: number;
  private readonly _rowNumberName?: string;

  constructor(
    resultSet: ResultSet<any>,
    opts: {
      rowType: RowType;
      rowNumberIdx?: number;
      rowNumberName?: string;
    },
  ) {
    this._rowType = opts.rowType;
    this._resultSet = resultSet;
    this._rowNumberIdx = opts.rowNumberIdx;
    this._rowNumberName = opts.rowNumberName;
  }

  get isClosed() {
    return !this._resultSet;
  }

  get rowType(): RowType {
    return this._rowType;
  }

  async close(): Promise<void> {
    if (!this._resultSet) return;
    const resultSet = this._resultSet;
    return new Promise((resolve, reject) => {
      resultSet.close(err => {
        if (err) return reject(err);
        this._resultSet = undefined;
        resolve();
      });
    });
  }

  fetch(nRows: number): Promise<any[] | undefined> {
    return new Promise((resolve, reject) => {
      if (!this._resultSet) return resolve(undefined);
      const resultSet = this._resultSet;
      resultSet.getRows(nRows, (err, rows) => {
        if (err) return reject(err);
        if (!(rows && rows.length)) return resolve(undefined);
        /* remove row$number fields */
        if (this._rowNumberName) {
          for (const row of rows) {
            if (Array.isArray(row)) row.splice(this._rowNumberIdx || 0, 1);
            else delete row[this._rowNumberName];
          }
        }
        resolve(rows);
      });
    });
  }
}
