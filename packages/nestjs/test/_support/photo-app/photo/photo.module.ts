import { Module } from '@nestjs/common';
import { PhotoController } from './photo.controller.js';
import { PhotoService } from './photo.service.js';

@Module({
  providers: [PhotoService],
  controllers: [PhotoController],
})
export class PhotoModule {}
