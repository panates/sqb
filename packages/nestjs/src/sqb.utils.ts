import { Logger, Type } from '@nestjs/common';
import { SqbClient } from '@sqb/connect';
import { Observable } from 'rxjs';
import { delay, retryWhen, scan } from 'rxjs/operators';

const logger = new Logger('SqbModule');

/**
 * This function returns a Connection injection token for the given connection name.
 * @param {string | symbol} [name=SQB_DEFAULT_CONNECTION] This optional parameter is either
 * a SqbClient, or a ConnectionOptions or a string.
 * @returns {string | symbol} The Connection injection token.
 */
export function getSQBToken(
  name?: string | symbol | Type<SqbClient>,
): string | symbol | Type<SqbClient> {
  if (!name) return SqbClient;
  if (typeof name === 'symbol' || typeof name === 'function') return name;
  return `${name}_SqbConnection`;
}

export function handleRetry(
  connectionName?: string | symbol | Type<SqbClient>,
  retryAttempts = 9,
  retryDelay = 3000,
  verboseRetryLog = false,
  toRetry?: (err: any) => boolean,
): <T>(source: Observable<T>) => Observable<T> {
  return <T>(source: Observable<T>) =>
    source.pipe(
      retryWhen(e =>
        e.pipe(
          scan((errorCount, error: Error) => {
            if (toRetry && !toRetry(error)) {
              throw error;
            }
            const connectionInfo =
              !connectionName || connectionName === SqbClient
                ? 'default'
                : ` (${String(connectionName)})`;
            const verboseMessage = verboseRetryLog
              ? ` Message: ${error.message}.`
              : '';

            logger.error(
              `Unable to connect to the database ${connectionInfo}.${verboseMessage} Retrying (${errorCount + 1})...`,
              error.stack,
            );
            if (errorCount + 1 >= retryAttempts) {
              throw error;
            }
            return errorCount + 1;
          }, 0),
          delay(retryDelay),
        ),
      ),
    );
}
