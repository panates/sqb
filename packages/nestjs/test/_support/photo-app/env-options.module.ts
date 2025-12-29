import { Module } from '@nestjs/common';
import { SqbModule } from '@sqb/nestjs';
import { PhotoModule } from './photo/photo.module.js';

process.env.SQB_DIALECT = 'postgres';
process.env.SQB_PASSWORD = 'postgres';

@Module({
  imports: [
    SqbModule.forRoot({
      name: 'db1',
    }),
    PhotoModule,
  ],
})
export class EnvOptionsFactoryModule {}
