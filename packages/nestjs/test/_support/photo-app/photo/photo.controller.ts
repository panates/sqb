import { Controller, Post } from '@nestjs/common';
import { PhotoService } from './photo.service.js';

@Controller('photo')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Post()
  create(): Promise<any> {
    return this.photoService.create();
  }
}
