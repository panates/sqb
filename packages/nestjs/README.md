<p style="text-align:center">
  <img src="https://user-images.githubusercontent.com/3836517/32965280-1a2b63ce-cbe7-11e7-8ee1-ba47313503c5.png" width="500px" alt="SQB Logo"/>
</p>

<br>

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Dependencies][dependencies-image]][dependencies-url]
[![DevDependencies][devdependencies-image]][devdependencies-url]
[![Package Quality][quality-image]][quality-url]

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## Main goals

- Single code base for any sql based database
- Powerful and simplified query coding scheme
- Fast applications with low memory requirements
- Let applications work with large data tables efficiently
- Support latest JavaScript language standards
- Lightweight and extensible framework.

You can report bugs and discuss features on the [GitHub issues](https://github.com/sqbjs/sqb/issues) page

Thanks to all of the great [contributions](https://github.com/sqbjs/sqb/graphs/contributors) to the project.

You may want to check detailed [DOCUMENTATION](https://sqbjs.github.io/sqb/)

## Installation

```bash
$ npm install @sqb/nestjs --save
```

## Node Compatibility

- node >= 16.x

## Environment Variables

The library supports configuration through environment variables. Environment variables below is accepted.
All environment variables starts with prefix (SQB\_). This can be configured while registering the module.

<!--- BEGIN env --->

| Environment Variable         | Type    | Default | Description                                           |
|------------------------------|---------|---------|-------------------------------------------------------|
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
| SQB_POOL_MAX_QUEUE           | Number  |         | Maximum number of queued connection requests          |
| SQB_POOL_MIN_IDLE            | Number  |         | Minimum number of idle connections to keep            |
| SQB_POOL_VALIDATION          | Boolean |         | Enables validation of connections before use          |
| SQB_POOL_HOUSE_KEEP_INTERVAL | Number  |         | Interval (ms) for pool housekeeping tasks             |

<!--- END env --->

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/nestjs.svg
[npm-url]: https://npmjs.org/package/@sqb/nestjs
[travis-image]: https://img.shields.io/travis/sqbjs/@sqb/nestjs/master.svg
[travis-url]: https://travis-ci.org/sqbjs/@sqb/nestjs
[coveralls-image]: https://img.shields.io/coveralls/sqbjs/@sqb/nestjs/master.svg
[coveralls-url]: https://coveralls.io/r/sqbjs/@sqb/nestjs
[downloads-image]: https://img.shields.io/npm/dm/@sqb/nestjs.svg
[downloads-url]: https://npmjs.org/package/@sqb/nestjs
[gitter-image]: https://badges.gitter.im/sqbjs/@sqb/nestjs.svg
[gitter-url]: https://gitter.im/sqbjs/@sqb/nestjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[dependencies-image]: https://david-dm.org/sqbjs/@sqb/nestjs/status.svg
[dependencies-url]: https://david-dm.org/sqbjs/@sqb/nestjs
[devdependencies-image]: https://david-dm.org/sqbjs/@sqb/nestjs/dev-status.svg
[devdependencies-url]: https://david-dm.org/sqbjs/@sqb/nestjs?type=dev
[quality-image]: http://npm.packagequality.com/shield/@sqb/nestjs.png
[quality-url]: http://packagequality.com/#?package=@sqb/nestjs

