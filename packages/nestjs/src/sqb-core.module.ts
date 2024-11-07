import { DynamicModule, Global, Inject, Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SqbClient } from '@sqb/connect';
import * as crypto from 'crypto';
import { defer } from 'rxjs';
import * as rxjs from 'rxjs';
import { SQB_MODULE_ID, SQB_MODULE_OPTIONS } from './sqb.constants.js';
import { SqbModuleAsyncOptions, SqbModuleOptions, SqbOptionsFactory } from './sqb.interface.js';
import { getSQBToken, handleRetry } from './sqb.utils.js';

@Global()
@Module({})
export class SqbCoreModule implements OnApplicationShutdown {
  constructor(
    @Inject(SQB_MODULE_OPTIONS)
    private readonly options: SqbModuleOptions,
    private readonly moduleRef: ModuleRef,
  ) {}

  static forRoot(options: SqbModuleOptions = {}): DynamicModule {
    const optionsProvider = {
      provide: SQB_MODULE_OPTIONS,
      useValue: options,
    };
    const connectionProvider = {
      provide: getSQBToken(options.name),
      useFactory: () => this.createConnection(options),
    };

    return {
      module: SqbCoreModule,
      providers: [connectionProvider, optionsProvider],
      exports: [connectionProvider],
    };
  }

  static forRootAsync(options: SqbModuleAsyncOptions): DynamicModule {
    const connectionProvider = {
      provide: getSQBToken(options.name),
      inject: [SQB_MODULE_OPTIONS],
      useFactory: async (sqbOptions: SqbModuleOptions) => this.createConnection(sqbOptions),
    };

    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: SqbCoreModule,
      imports: options.imports,
      providers: [
        ...asyncProviders,
        connectionProvider,
        {
          provide: SQB_MODULE_ID,
          useValue: crypto.randomUUID(),
        },
      ],
      exports: [connectionProvider],
    };
  }

  async onApplicationShutdown() {
    const client = this.moduleRef.get<SqbClient>(getSQBToken(this.options.name));
    if (client) await client.close(this.options.shutdownWaitMs);
  }

  private static createAsyncProviders(options: SqbModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) return [this.createAsyncOptionsProvider(options)];

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    throw new Error('Invalid configuration. Must provide useFactory, useClass or useExisting');
  }

  private static createAsyncOptionsProvider(options: SqbModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: SQB_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    const useClass = options.useClass || options.useExisting;
    if (useClass) {
      return {
        provide: SQB_MODULE_OPTIONS,
        useFactory: (optionsFactory: SqbOptionsFactory) => optionsFactory.createSqbOptions(options.name),
        inject: [useClass],
      };
    }
    throw new Error('Invalid configuration. Must provide useFactory, useClass or useExisting');
  }

  private static async createConnection(options: SqbModuleOptions): Promise<SqbClient> {
    const connectionToken = options.name;
    // NestJS 8
    // @ts-ignore
    if (rxjs.lastValueFrom) {
      // @ts-ignore
      return await rxjs.lastValueFrom(
        defer(async () => new SqbClient(options)).pipe(
          handleRetry(
            connectionToken,
            options.retryAttempts,
            options.retryDelay,
            options.verboseRetryLog,
            options.toRetry,
          ),
        ),
      );
    }
    // NestJS 7
    // @ts-ignore
    return await defer(async () => new SqbClient(options))
      .pipe(
        handleRetry(
          connectionToken,
          options.retryAttempts,
          options.retryDelay,
          options.verboseRetryLog,
          options.toRetry,
        ),
      )
      .toPromise();
  }
}
