import type { InjectionToken, LoggerService } from '@nestjs/common';
import type { ModuleMetadata } from '@nestjs/common/interfaces/index.js';
import type { ClientConfiguration } from '@sqb/connect';

/**
 * `@sqb/connect` {@link ClientConfiguration} plus the NestJS-specific
 * options `@sqb/nestjs` reads on top of it.
 */
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

/** Options common to both the synchronous and factory-based module registration forms. */
interface BaseModuleOptions {
  /** Injection token the `SqbClient` provider is registered under. Defaults to the `SqbClient` class itself. */
  token?: InjectionToken;
  /** Prefix used to read connection options from environment variables (e.g. `SQB_HOST`) for any option not given explicitly. Defaults to `'SQB_'`. */
  envPrefix?: string;
  logger?: LoggerService | string;
  /** Registers the module as a NestJS global module (available everywhere without re-importing). */
  global?: boolean;
}

/** Options for {@link SqbModule.forRoot}: connection options are given directly as `useValue`. */
export interface SqbModuleOptions extends BaseModuleOptions {
  useValue?: SqbClientConnectionOptions;
}

/** Options for {@link SqbModule.forRootAsync}: connection options are produced by an injected factory function, e.g. to read them from a NestJS `ConfigService`. */
export interface SqbModuleAsyncOptions
  extends BaseModuleOptions, Partial<Pick<ModuleMetadata, 'imports'>> {
  /** Providers to inject as arguments into `useFactory`. */
  inject?: any[];
  /** Produces the connection options, optionally asynchronously, from the providers listed in `inject`. */
  useFactory?: (
    ...args: any[]
  ) => Promise<SqbClientConnectionOptions> | SqbClientConnectionOptions;
}
