import { InjectionToken, LoggerService, Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { ClientConfiguration } from '@sqb/connect';

export interface SqbClientConnectionOptions extends ClientConfiguration {
  /**
   * Number of ms to wait closing connection on shutdown
   * Default: 10
   */
  shutdownWaitMs?: number;

  /**
   * If `true`, will not connect to database on application start
   * Default: `false`
   */
  lazyConnect?: boolean;
}

interface BaseModuleOptions {
  token?: InjectionToken;
  envPrefix?: string;
  logger?: LoggerService | string;
  global?: boolean;
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
  extends BaseModuleOptions, Partial<Pick<ModuleMetadata, 'imports'>> {
  inject?: any[];
  useFactory?: (
    ...args: any[]
  ) => Promise<SqbClientConnectionOptions> | SqbClientConnectionOptions;
}
