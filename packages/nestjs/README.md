<p style="text-align:center">
  <img src="https://user-images.githubusercontent.com/3836517/32965280-1a2b63ce-cbe7-11e7-8ee1-ba47313503c5.png" width="500px" alt="SQB Logo"/>
</p>

<br>

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![CI Tests][ci-test-image]][ci-test-url]
[![Test Coverage][coveralls-image]][coveralls-url]

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## About @sqb/nestjs

`@sqb/nestjs` wires an [`@sqb/connect`](../connect) `SqbClient` into a NestJS application as an
injectable, application-scoped provider. `SqbModule.forRoot()` accepts connection options directly
(or falls back to `SQB_*` environment variables — see below), while `SqbModule.forRootAsync()`
resolves them from a factory, e.g. NestJS's `ConfigService`. Either way, the module opens the
connection on `onApplicationBootstrap` and closes it gracefully on `onApplicationShutdown`.

```ts
import { Module } from '@nestjs/common';
import { SqbModule } from '@sqb/nestjs';

@Module({
  imports: [
    SqbModule.forRoot({
      useValue: {
        dialect: 'postgres',
        host: 'localhost',
        database: 'mydb',
      },
    }),
  ],
})
export class AppModule {}
```

The client is provided under the `SqbClient` token by default (override it with `token` in the
module options if you need to register more than one connection), so it can be injected like any
other NestJS provider:

```ts
import { Injectable } from '@nestjs/common';
import { SqbClient } from '@sqb/connect';

@Injectable()
export class UsersService {
  constructor(private readonly client: SqbClient) {}

  findAll() {
    return this.client.getRepository('User').findMany();
  }
}
```

For async, factory-based configuration:

```ts
SqbModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    dialect: 'postgres',
    host: config.get('DB_HOST'),
    database: config.get('DB_NAME'),
  }),
});
```

## Installation

```bash
$ npm install @sqb/nestjs --save
```

## Node Compatibility

- node >= 20.x

## Environment Variables

The library supports configuration through environment variables. Environment variables below is accepted.
All environment variables starts with prefix (SQB\_). This can be configured while registering the module.

<!--- BEGIN env --->

| Environment Variable         | Type    | Default | Description                                           |
| ----------------------------- | ------- | ------- | ----------------------------------------------------- |
| SQB_DIALECT                  | String  |         | Database dialect (e.g. postgres, mysql, oracle)       |
| SQB_CONNECTION_NAME          | String  |         | Logical name of the database connection               |
| SQB_HOST                     | String  |         | Database server host address                          |
| SQB_PORT                     | Number  |         | Database server port                                  |
| SQB_DATABASE                 | String  |         | Database name                                         |
| SQB_SCHEMA                   | String  |         | Default database schema                               |
| SQB_USER                     | String  |         | Database user name                                    |
| SQB_PASSWORD                 | String  |         | Database user password                                |
| SQB_DRIVER                   | String  |         | Database driver identifier                            |
| SQB_POOL_MAX                 | Number  |         | Maximum number of connections in the pool             |
| SQB_POOL_MIN                 | Number  |         | Minimum number of connections in the pool             |
| SQB_POOL_IDLE_TIMEOUT        | Number  |         | Time (ms) before an idle connection is released       |
| SQB_POOL_ACQUIRE_TIMEOUT     | Number  |         | Timeout (ms) for acquiring a connection               |
| SQB_POOL_ACQUIRE_MAX_RETRIES | Number  |         | Maximum number of retries when acquiring a connection |
| SQB_POOL_ACQUIRE_RETRY_WAIT  | Number  |         | Wait time (ms) between acquire retry attempts         |
| SQB_POOL_FIFO                | Boolean |         | Whether the pool queue operates in FIFO mode          |
| SQB_POOL_MAX_QUEUE            | Number  |         | Maximum number of queued connection requests          |
| SQB_POOL_MIN_IDLE             | Number  |         | Minimum number of idle connections to keep            |
| SQB_POOL_VALIDATION           | Boolean |         | Enables validation of connections before use          |
| SQB_POOL_HOUSE_KEEP_INTERVAL | Number  |         | Interval (ms) for pool housekeeping tasks             |

<!--- END env --->

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/nestjs.svg
[npm-url]: https://npmjs.org/package/@sqb/nestjs
[downloads-image]: https://img.shields.io/npm/dm/@sqb/nestjs.svg
[downloads-url]: https://npmjs.org/package/@sqb/nestjs
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
