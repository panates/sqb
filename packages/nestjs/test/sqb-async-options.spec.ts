import '@sqb/postgres';
import { Server } from 'http';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AsyncOptionsFactoryModule } from './_support/photo-app/async-options.module.js';

describe('Sqb-Nestjs (async-options)', () => {

  let server: Server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AsyncOptionsFactoryModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it(`should return created entity`, () => {
    return request(server)
        .post('/photo')
        .expect(201, {name: 'Nest', description: 'Is great!', views: 6000});
  });

  afterEach(async () => {
    await app.close();
  });
});
