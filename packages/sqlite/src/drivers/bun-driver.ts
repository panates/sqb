// This module is only ever loaded via a dynamic import() from a Bun
// runtime (see ./index.ts), so a static import of 'bun:sqlite' is safe.
import { Database, type Statement } from 'bun:sqlite';
import type {
  NativeColumnInfo,
  NativeDatabase,
  NativeStatement,
  SqliteDriver,
} from './types.js';

/** {@link NativeStatement} implementation wrapping `bun:sqlite`'s `Statement`. */
class BunStatement implements NativeStatement {
  constructor(private _stmt: Statement) {}

  /** Runs the statement, normalizing the result to {@link NativeRunResult}'s shape. */
  run(params?: Record<string, any>) {
    const r = params ? this._stmt.run(params) : this._stmt.run();
    return {
      changes: Number(r.changes),
      lastInsertRowid: Number(r.lastInsertRowid),
    };
  }

  get(params?: Record<string, any>) {
    return this._stmt.get(params ?? {}) ?? undefined;
  }

  all(params?: Record<string, any>) {
    return params ? this._stmt.all(params) : this._stmt.all();
  }

  iterate(params?: Record<string, any>) {
    return params ? this._stmt.iterate(params) : this._stmt.iterate();
  }

  /** Converts `bun:sqlite`'s column metadata into {@link NativeColumnInfo}. */
  columns(): NativeColumnInfo[] {
    const names = this._stmt.columnNames;
    let types: (string | null)[] = [];
    try {
      types = this._stmt.declaredTypes;
    } catch {
      // declaredTypes throws until the statement has executed at least
      // once; fall back to names-only metadata in that case.
    }
    return names.map((name, i) => ({
      name,
      declaredType: types[i] ?? null,
    }));
  }
}

/** {@link NativeDatabase} implementation wrapping `bun:sqlite`'s `Database`. */
class BunDatabase implements NativeDatabase {
  constructor(private _db: Database) {}

  get inTransaction(): boolean {
    return this._db.inTransaction;
  }

  exec(sql: string): void {
    this._db.exec(sql);
  }

  prepare(sql: string): NativeStatement {
    return new BunStatement(this._db.query(sql));
  }

  close(): void {
    this._db.close();
  }
}

/** {@link SqliteDriver} backed by Bun's built-in `bun:sqlite` module. */
export const bunDriver: SqliteDriver = {
  open(filename: string): NativeDatabase {
    return new BunDatabase(new Database(filename));
  },
};
