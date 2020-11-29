import {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AsyncApplicationModule} from './_support/photo-app/app-async.module';
import {Server} from 'http';
import {createSchema} from './_support/create-schema';

describe('Sqb-Nestjs (async configuration)', () => {

    let server: Server;
    let app: INestApplication;

    before(() => createSchema());

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            imports: [AsyncApplicationModule],
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
