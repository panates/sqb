import { type DynamicModule, Module } from '@nestjs/common';
import type {
  SqbModuleAsyncOptions,
  SqbModuleOptions,
} from './sqb.interface.js';
import { SqbCoreModule } from './sqb-core.module.js';

/**
 * NestJS module registering an `@sqb/connect` `SqbClient` (or a custom
 * injection token) as an injectable provider, connecting it on application
 * bootstrap and closing it on shutdown. A thin public wrapper delegating
 * to {@link SqbCoreModule} for the actual provider setup.
 */
@Module({})
export class SqbModule {
  /**
   * Registers `@sqb/nestjs` with connection options given directly, e.g.
   * `SqbModule.forRoot({ useValue: { dialect: 'postgres', host: '...' } })`.
   */
  static forRoot(options?: SqbModuleOptions): DynamicModule {
    return {
      module: SqbModule,
      imports: [SqbCoreModule.forRoot(options)],
    };
  }

  /**
   * Registers `@sqb/nestjs` with connection options produced by an
   * injected factory, e.g. to read them from a NestJS `ConfigService`.
   */
  static forRootAsync(options: SqbModuleAsyncOptions): DynamicModule {
    return {
      module: SqbModule,
      imports: [SqbCoreModule.forRootAsync(options)],
    };
  }
}
