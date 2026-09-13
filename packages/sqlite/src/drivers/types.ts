/** A single result column's name and (if declared in the schema) SQL type, as reported by a {@link NativeStatement}. */
export interface NativeColumnInfo {
  name: string;
  declaredType: string | null;
}

/** Outcome of a data-modifying statement, normalized to plain `number`s across both `node:sqlite` (which returns `bigint`) and `bun:sqlite`. */
export interface NativeRunResult {
  changes: number;
  lastInsertRowid: number;
}

/** Common surface a prepared statement must expose, implemented separately for `node:sqlite` (`./node-driver.ts`) and `bun:sqlite` (`./bun-driver.ts`) so {@link SqliteConnection} can stay driver-agnostic. */
export interface NativeStatement {
  run(params?: Record<string, any>): NativeRunResult;
  get(params?: Record<string, any>): Record<string, any> | undefined;
  all(params?: Record<string, any>): Record<string, any>[];
  iterate(params?: Record<string, any>): IterableIterator<Record<string, any>>;
  /**
   * Must be called after at least one run()/get()/all()/iterate() call to
   * get accurate declaredType info on Bun; column names are always accurate.
   */
  columns(): NativeColumnInfo[];
}

/** Common surface an open database connection must expose, implemented separately for `node:sqlite` (`./node-driver.ts`) and `bun:sqlite` (`./bun-driver.ts`). */
export interface NativeDatabase {
  readonly inTransaction: boolean;
  exec(sql: string): void;
  prepare(sql: string): NativeStatement;
  close(): void;
}

/** Opens a {@link NativeDatabase} for a given runtime - see `./index.ts`, which picks `bunDriver` or `nodeDriver` based on which runtime is active. */
export interface SqliteDriver {
  open(filename: string): NativeDatabase;
}
