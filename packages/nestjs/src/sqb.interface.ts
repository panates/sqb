import { LoggerService, Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { ClientConfiguration } from '@sqb/connect';

export interface SqbClientConnectionOptions extends ClientConfiguration {
  /**
   * Number of times to retry connecting
   * Default: 10
   */
  retryAttempts?: number;
  /**
   * Delay between connection retry attempts (ms)
   * Default: 3000
   */
  retryDelay?: number;
  /**
   * Function that determines whether the module should
   * attempt to connect upon failure.
   *
   * @param err error that was thrown
   * @returns whether to retry connection or not
   */
  toRetry?: (err: any) => boolean;
  /**
   * If `true`, connection will not be closed on application shutdown.
   */
  keepConnectionAlive?: boolean;
  /**
   * If `true`, will show verbose error messages on each connection retry.
   */
  verboseRetryLog?: boolean;
  /**
   * Number of ms to wait closing connection on shutdown
   * Default: 10
   */
  shutdownWaitMs?: number;
}

interface BaseModuleOptions {
  envPrefix?: string;
  logger?: LoggerService | string;
  global?: boolean;
  name?: string;
}

export interface SqbModuleOptions extends BaseModuleOptions {
  useValue?: SqbClientConnectionOptions;
}

export interface SqbOptionsFactory {
  createSqbOptions(
    connectionName?: string,
  ): Promise<SqbClientConnectionOptions> | SqbClientConnectionOptions;
}

export interface SqbModuleAsyncOptions
  extends BaseModuleOptions, Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useExisting?: Type<SqbOptionsFactory>;
  useClass?: Type<SqbOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<SqbClientConnectionOptions> | SqbClientConnectionOptions;
  inject?: any[];
}
