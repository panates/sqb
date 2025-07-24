import '@sqb/postgres';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import request from 'supertest';
import { AsyncOptionsClassModule } from './_support/photo-app/async-class-options.module.js';

describe('nestjs:Sqb-Nestjs (async-class)', () => {
  let server: Server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AsyncOptionsClassModule],
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
