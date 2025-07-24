import { DynamicModule, Module } from '@nestjs/common';
import { SqbModuleAsyncOptions, SqbModuleOptions } from './sqb.interface.js';
import { SqbCoreModule } from './sqb-core.module.js';

@Module({})
export class SqbModule {
  static forRoot(options?: SqbModuleOptions): DynamicModule {
    return {
      module: SqbModule,
      imports: [SqbCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(options: SqbModuleAsyncOptions): DynamicModule {
    return {
      module: SqbModule,
      imports: [SqbCoreModule.forRootAsync(options)],
    };
  }
}
