import { Module } from '@nestjs/common';
import {
  SqbClientConnectionOptions,
  SqbModule,
  SqbOptionsFactory,
} from '@sqb/nestjs';
import { dbConfig } from './config.js';
import { PhotoModule } from './photo/photo.module.js';

class ConfigService implements SqbOptionsFactory {
  createSqbOptions(): SqbClientConnectionOptions {
    return dbConfig.useValue!;
  }
}

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}

@Module({
  imports: [
    SqbModule.forRootAsync({
      imports: [ConfigModule],
      name: 'db1',
      useExisting: ConfigService,
    }),
    PhotoModule,
  ],
})
export class AsyncOptionsExistingModule {}
