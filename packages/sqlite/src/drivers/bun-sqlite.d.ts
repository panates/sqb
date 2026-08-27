// Minimal ambient typing for the subset of `bun:sqlite` this package uses.
// We deliberately avoid depending on the `bun-types` package here: its
// global declarations conflict with `@types/node`, which the rest of this
// monorepo relies on.
declare module 'bun:sqlite' {
  export interface SQLQueryBindings {
    [key: string]: string | number | bigint | boolean | Uint8Array | null;
  }

  export class Statement<
    Row = Record<string, any>,
    Params extends unknown[] = any[],
  > {
    readonly columnNames: string[];
    readonly declaredTypes: (string | null)[];
    run(...params: Params): { changes: number; lastInsertRowid: number };
    get(...params: Params): Row | null;
    all(...params: Params): Row[];
    iterate(...params: Params): IterableIterator<Row>;
    finalize(): void;
  }

  export class Database {
    constructor(filename?: string, options?: Record<string, unknown>);
    readonly inTransaction: boolean;
    exec(sql: string): void;
    run(sql: string): void;
    query<Row = Record<string, any>, Params extends unknown[] = any[]>(
      sql: string,
    ): Statement<Row, Params>;
    prepare<Row = Record<string, any>, Params extends unknown[] = any[]>(
      sql: string,
    ): Statement<Row, Params>;
    close(): void;
  }
}
