import { Module } from '@nestjs/common';
import { SqbModule, SqbModuleOptions, SqbOptionsFactory } from '@sqb/nestjs';
import { dbConfig } from './config.js';
import { PhotoModule } from './photo/photo.module.js';

class ConfigService implements SqbOptionsFactory {
  createSqbOptions(): SqbModuleOptions {
    return dbConfig;
  }
}

@Module({
  imports: [
    SqbModule.forRootAsync({
      name: 'db1',
      useClass: ConfigService,
    }),
    PhotoModule,
  ],
})
export class AsyncOptionsClassModule {}
