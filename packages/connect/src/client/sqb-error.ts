import { Query } from '@sqb/builder';
import type { QueryExecuteOptions, QueryRequest } from './types.js';

/**
 * Wraps an error raised by a driver during query execution, attaching the
 * offending query and the options/request it was executed with so error
 * handlers/logging have full context - this is what `SqbConnection.execute()`
 * throws (and emits as an `'error'` event) instead of the raw driver error.
 */
export class SQBError extends Error {
  /** The original error thrown by the driver. */
  cause?: Error;
  /** The query that was being executed (as passed to `execute()` - a raw SQL string or a `@sqb/builder` query). */
  declare query: string | Query;
  /** The options `execute()` was called with. */
  queryOptions?: QueryExecuteOptions;
  /** The prepared, dialect-specific request that was sent to the driver, if it got that far. */
  request?: QueryRequest;

  /**
   * @param message - The error message (typically `cause.message`).
   * @param cause - The original driver error, if any; its `stack` is reused so the trace still points at the real failure.
   */
  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
    if (cause) this.stack = cause.stack;
  }
}
