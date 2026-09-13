import assert from 'node:assert';
import {
  type DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
  type Provider,
} from '@nestjs/common';
import { SqbClient } from '@sqb/connect';
import colors from 'ansi-colors';
import * as crypto from 'crypto';
import { getSqbConfig } from './get-sqb-config.js';
import {
  SQB_CONNECTION_OPTIONS,
  SQB_MODULE_ID,
  SQB_MODULE_OPTIONS,
} from './sqb.constants.js';
import type {
  SqbClientConnectionOptions,
  SqbModuleAsyncOptions,
  SqbModuleOptions,
} from './sqb.interface.js';

/**
 * Fixed injection token the `SqbClient` provider is always additionally
 * registered under (via `useExisting`), regardless of the caller-chosen
 * `token` option - lets this module's own lifecycle hooks
 * (`onApplicationBootstrap`/`onApplicationShutdown`) resolve the client
 * without needing to know what token the caller picked.
 */
const CLIENT_TOKEN = Symbol('CLIENT_TOKEN');

/**
 * The NestJS dynamic module that actually registers `@sqb/nestjs`'s
 * providers - {@link SqbModule} is a thin public wrapper around this one.
 * Registered `@Global()` so the `SqbClient` provider need not be
 * re-imported into every feature module that injects it.
 */
@Global()
@Module({})
export class SqbCoreModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  /** Registers `@sqb/nestjs` with connection options given directly (merged with environment-variable defaults via `getSqbConfig`). */
  static forRoot(moduleOptions: SqbModuleOptions = {}): DynamicModule {
    const connectionOptions = getSqbConfig(
      moduleOptions.useValue || {},
      moduleOptions.envPrefix,
    );
    return this._createDynamicModule(moduleOptions, {
      global: moduleOptions.global,
      providers: [
        {
          provide: SQB_CONNECTION_OPTIONS,
          useValue: connectionOptions,
        },
      ],
    });
  }

  /**
   * Registers `@sqb/nestjs` with connection options produced by an
   * injected factory (`asyncOptions.useFactory`), merged with
   * environment-variable defaults via `getSqbConfig`.
   *
   * @throws {Error} if `asyncOptions.useFactory` is not given
   */
  static forRootAsync(asyncOptions: SqbModuleAsyncOptions): DynamicModule {
    assert.ok(asyncOptions.useFactory, 'useFactory is required');
    return this._createDynamicModule(asyncOptions, {
      global: asyncOptions.global,
      providers: [
        {
          provide: SQB_CONNECTION_OPTIONS,
          inject: asyncOptions.inject,
          useFactory: async (...args) => {
            const opts = await asyncOptions.useFactory!(...args);
            return getSqbConfig(opts, asyncOptions.envPrefix);
          },
        },
      ],
    });
  }

  /**
   * Builds the {@link DynamicModule} shared by `forRoot`/`forRootAsync`:
   * registers the `SqbClient` provider (under the caller-chosen `token`,
   * defaulting to the `SqbClient` class) built from whatever provider
   * `metadata` resolves `SQB_CONNECTION_OPTIONS`, plus the fixed
   * {@link CLIENT_TOKEN} alias, a per-registration `SQB_MODULE_ID`, and a
   * `Logger` provider (the caller's, or a new one scoped `'SQB'`).
   */
  private static _createDynamicModule(
    opts: SqbModuleOptions | SqbModuleAsyncOptions,
    metadata: Partial<DynamicModule>,
  ): DynamicModule {
    const token = opts.token || SqbClient;
    const providers: Provider[] = [
      ...(metadata.providers ?? []),
      {
        provide: SQB_MODULE_OPTIONS,
        useValue: opts,
      },
      {
        provide: token,
        inject: [SQB_CONNECTION_OPTIONS],
        useFactory: (sqbConnectionOptions: SqbClientConnectionOptions) =>
          new SqbClient(sqbConnectionOptions),
      },
      {
        provide: CLIENT_TOKEN,
        useExisting: token,
      },
      {
        provide: SQB_MODULE_ID,
        useValue: crypto.randomUUID(),
      },
      {
        provide: Logger,
        useValue: opts.logger || new Logger('SQB'),
      },
    ];
    return {
      module: SqbCoreModule,
      ...metadata,
      providers,
      exports: [...(metadata.exports ?? []), SQB_CONNECTION_OPTIONS, token],
    } as DynamicModule;
  }

  constructor(
    @Inject(CLIENT_TOKEN)
    protected readonly client: SqbClient,
    @Inject(SQB_CONNECTION_OPTIONS)
    private readonly connectionOptions: SqbClientConnectionOptions,
    @Inject(Logger)
    private logger: Logger,
  ) {}

  /**
   * Connects to the database (unless `lazyConnect` is set) as soon as the
   * NestJS application finishes bootstrapping, logging a "waiting to
   * connect" notice if it takes more than a second, and rethrowing (after
   * logging) any connection failure so application startup fails loudly
   * rather than serving traffic against a database that isn't reachable.
   */
  onApplicationBootstrap() {
    if (this.connectionOptions.lazyConnect) return;

    Logger.flush();
    const logTimer = setTimeout(() => {
      this.logger?.verbose(
        `Waiting to connect to Database [${colors.blue(this.connectionOptions.dialect || '')}]`,
      );
    }, 1000);
    return this.client
      .test()
      .catch(e => {
        clearTimeout(logTimer);
        this.logger?.error('Database connection failed: ' + e.message);
        throw e;
      })
      .then(() => {
        clearTimeout(logTimer);
        this.logger?.log(`Database connection established`);
      });
  }

  /** Closes the `SqbClient` connection as the NestJS application shuts down, waiting up to `connectionOptions.shutdownWaitMs` for it. */
  async onApplicationShutdown() {
    await this.client.close(this.connectionOptions.shutdownWaitMs);
  }
}
