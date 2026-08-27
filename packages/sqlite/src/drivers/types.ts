export interface NativeColumnInfo {
  name: string;
  declaredType: string | null;
}

export interface NativeRunResult {
  changes: number;
  lastInsertRowid: number;
}

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

export interface NativeDatabase {
  readonly inTransaction: boolean;
  exec(sql: string): void;
  prepare(sql: string): NativeStatement;
  close(): void;
}

export interface SqliteDriver {
  open(filename: string): NativeDatabase;
}
