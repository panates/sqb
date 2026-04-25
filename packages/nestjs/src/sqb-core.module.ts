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

const CLIENT_TOKEN = Symbol('CLIENT_TOKEN');

@Global()
@Module({})
export class SqbCoreModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
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

  async onApplicationShutdown() {
    await this.client.close(this.connectionOptions.shutdownWaitMs);
  }
}
