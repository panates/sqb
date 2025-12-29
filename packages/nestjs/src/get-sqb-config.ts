import process from 'node:process';
import { clone } from '@jsopen/objects';
import { toBoolean, toInt } from 'putil-varhelpers';
import { SqbClientConnectionOptions } from './sqb.interface.js';

export function getSqbConfig(
  moduleOptions: SqbClientConnectionOptions,
  prefix: string = 'SQB_',
): SqbClientConnectionOptions {
  const options = clone(moduleOptions);
  const env = process.env;
  options.dialect = options.dialect || env[prefix + 'DIALECT'];
  options.name = options.name || env[prefix + 'CONNECTION_NAME'];
  options.host = options.host || env[prefix + 'HOST'];
  options.port = options.port || toInt(env[prefix + 'PORT']);
  options.database = options.database || env[prefix + 'DATABASE'];
  options.schema = options.schema || env[prefix + 'SCHEMA'];
  options.user = options.user || env[prefix + 'USER'];
  options.password = options.password || env[prefix + 'PASSWORD'];
  options.driver = options.driver || env[prefix + 'DRIVER'];
  options.pool = options.pool || {};
  options.pool.max = options.pool.max || toInt(env[prefix + 'POOL_MAX']);
  options.pool.min = options.pool.min || toInt(env[prefix + 'POOL_MIN']);
  options.pool.idleTimeoutMillis =
    options.pool.idleTimeoutMillis || toInt(env[prefix + 'POOL_IDLE_TIMEOUT']);
  options.pool.acquireTimeoutMillis =
    options.pool.acquireTimeoutMillis ||
    toInt(env[prefix + 'POOL_ACQUIRE_TIMEOUT']);
  options.pool.acquireMaxRetries =
    options.pool.acquireMaxRetries ||
    toInt(env[prefix + 'POOL_ACQUIRE_MAX_RETRIES']);
  options.pool.acquireRetryWait =
    options.pool.acquireRetryWait ||
    toInt(env[prefix + 'POOL_ACQUIRE_RETRY_WAIT']);
  options.pool.fifo = options.pool.fifo || toBoolean(env[prefix + 'POOL_FIFO']);
  options.pool.maxQueue =
    options.pool.maxQueue || toInt(env[prefix + 'POOL_MAX_QUEUE']);
  options.pool.minIdle =
    options.pool.minIdle || toInt(env[prefix + 'POOL_MIN_IDLE']);
  options.pool.validation =
    options.pool.validation || toBoolean(env[prefix + 'POOL_VALIDATION']);
  options.pool.houseKeepInterval =
    options.pool.houseKeepInterval ||
    toInt(env[prefix + 'POOL_HOUSE_KEEP_INTERVAL']);
  return options;
}
