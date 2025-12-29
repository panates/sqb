import '@sqb/postgres';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import expect from 'expect';
import { Server } from 'http';
import request from 'supertest';
import { SQB_CONNECTION_OPTIONS } from '../src/sqb.constants.js';
import { SqbClientConnectionOptions } from '../src/sqb.interface.js';
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

  it(`should pass config to sqbClient correctly`, () => {
    const options = app.get<SqbClientConnectionOptions>(SQB_CONNECTION_OPTIONS);
    expect(options.dialect).toStrictEqual('postgres');
    expect(options.password).toStrictEqual('postgres');
  });

  it(`should return created entity`, () =>
    request(server)
      .post('/photo')
      .expect(201, { name: 'Nest', description: 'Is great!', views: 6000 }));
});
