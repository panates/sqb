import { Query } from '@sqb/builder';
import { QueryExecuteOptions, QueryRequest } from './types.js';

export class SQBError extends Error {
  cause?: Error;
  declare query: string | Query;
  queryOptions?: QueryExecuteOptions;
  request?: QueryRequest;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
    if (cause) this.stack = cause.stack;
  }
}
