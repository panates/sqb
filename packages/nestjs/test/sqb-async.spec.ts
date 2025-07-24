import '@sqb/postgres';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import request from 'supertest';
import { AsyncApplicationModule } from './_support/photo-app/app-async.module.js';

describe('nestjs:Sqb-Nestjs (async configuration)', () => {
  let server: Server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AsyncApplicationModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  afterEach(async () => app.close());

  it(`should return created entity`, () =>
    request(server)
      .post('/photo')
      .expect(201, { name: 'Nest', description: 'Is great!', views: 6000 }));
});
