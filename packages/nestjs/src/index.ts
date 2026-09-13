/**
 * @sqb/nestjs - NestJS integration module for `@sqb/connect`, exposing a
 * `SqbClient` (or a custom injection token) as an injectable NestJS
 * provider via {@link SqbModule}.
 */
export * from './sqb.interface.js';
export * from './sqb.module.js';
export { SqbClient } from '@sqb/connect';
