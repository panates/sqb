import { Module } from '@nestjs/common';
import { SqbModule } from '@sqb/nestjs';
import { dbConfig } from './config.js';
import { PhotoModule } from './photo/photo.module.js';

@Module({
  imports: [
    SqbModule.forRootAsync({
      token: 'db1',
      useFactory: () => dbConfig.useValue!,
    }),
    PhotoModule,
  ],
})
export class AsyncOptionsFactoryModule {}
