import { DynamicModule, Module } from '@nestjs/common';
import { SqbModule } from '@sqb/nestjs';
import { dbConfig } from './config.js';

@Module({})
export class DatabaseModule {
  static async forRoot(): Promise<DynamicModule> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      module: DatabaseModule,
      imports: [SqbModule.forRoot(dbConfig)],
    };
  }
}
