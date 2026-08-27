// This module is only ever loaded via a dynamic import() from a Node.js
// runtime (see ./index.ts), so a static import of 'node:sqlite' is safe.
import {
  DatabaseSync,
  type StatementColumnMetadata,
  type StatementSync,
} from 'node:sqlite';
import type {
  NativeColumnInfo,
  NativeDatabase,
  NativeStatement,
  SqliteDriver,
} from './types.js';

class NodeStatement implements NativeStatement {
  constructor(private _stmt: StatementSync) {}

  run(params?: Record<string, any>) {
    const r = params ? this._stmt.run(params) : this._stmt.run();
    return {
      changes: Number(r.changes),
      lastInsertRowid: Number(r.lastInsertRowid),
    };
  }

  get(params?: Record<string, any>) {
    return params ? this._stmt.get(params) : this._stmt.get();
  }

  all(params?: Record<string, any>) {
    return params ? this._stmt.all(params) : this._stmt.all();
  }

  iterate(params?: Record<string, any>) {
    return (
      params ? this._stmt.iterate(params) : this._stmt.iterate()
    ) as IterableIterator<Record<string, any>>;
  }

  columns(): NativeColumnInfo[] {
    return this._stmt.columns().map((c: StatementColumnMetadata) => ({
      name: c.name,
      declaredType: c.type,
    }));
  }
}

class NodeDatabase implements NativeDatabase {
  constructor(private _db: DatabaseSync) {}

  get inTransaction(): boolean {
    return this._db.isTransaction;
  }

  exec(sql: string): void {
    this._db.exec(sql);
  }

  prepare(sql: string): NativeStatement {
    return new NodeStatement(this._db.prepare(sql));
  }

  close(): void {
    this._db.close();
  }
}

export const nodeDriver: SqliteDriver = {
  open(filename: string): NativeDatabase {
    return new NodeDatabase(new DatabaseSync(filename));
  },
};
