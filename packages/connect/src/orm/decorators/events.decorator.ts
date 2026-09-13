import { EntityMetadata } from '../model/entity-metadata.js';

/**
 * Registers the decorated method under the entity's `'before-insert'`
 * lifecycle listeners (`EntityMetadata.eventListeners`).
 *
 * Note: as of this version, nothing in `@sqb/connect` (no repository
 * command) actually invokes these listeners during a create/update/delete -
 * they're recorded but not currently triggered by insert/update/destroy
 * operations.
 *
 * @throws {Error} If applied to a symbol-keyed property.
 */
export function BeforeInsert(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'before-insert', fn);
  };
}

/**
 * Registers the decorated method under the entity's `'before-update'`
 * lifecycle listeners (`EntityMetadata.eventListeners`).
 *
 * Note: as of this version, nothing in `@sqb/connect` (no repository
 * command) actually invokes these listeners during a create/update/delete -
 * they're recorded but not currently triggered by insert/update/destroy
 * operations.
 *
 * @throws {Error} If applied to a symbol-keyed property.
 */
export function BeforeUpdate(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'before-update', fn);
  };
}

/**
 * Registers the decorated method under the entity's `'before-destroy'`
 * lifecycle listeners (`EntityMetadata.eventListeners`).
 *
 * Note: as of this version, nothing in `@sqb/connect` (no repository
 * command) actually invokes these listeners during a create/update/delete -
 * they're recorded but not currently triggered by insert/update/destroy
 * operations.
 *
 * @throws {Error} If applied to a symbol-keyed property.
 */
export function BeforeDestroy(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'before-destroy', fn);
  };
}

/**
 * Registers the decorated method under the entity's `'after-insert'`
 * lifecycle listeners (`EntityMetadata.eventListeners`).
 *
 * Note: as of this version, nothing in `@sqb/connect` (no repository
 * command) actually invokes these listeners during a create/update/delete -
 * they're recorded but not currently triggered by insert/update/destroy
 * operations.
 *
 * @throws {Error} If applied to a symbol-keyed property.
 */
export function AfterInsert(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'after-insert', fn);
  };
}

/**
 * Registers the decorated method under the entity's `'after-update'`
 * lifecycle listeners (`EntityMetadata.eventListeners`).
 *
 * Note: as of this version, nothing in `@sqb/connect` (no repository
 * command) actually invokes these listeners during a create/update/delete -
 * they're recorded but not currently triggered by insert/update/destroy
 * operations.
 *
 * @throws {Error} If applied to a symbol-keyed property.
 */
export function AfterUpdate(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'after-update', fn);
  };
}

/**
 * Registers the decorated method under the entity's `'after-destroy'`
 * lifecycle listeners (`EntityMetadata.eventListeners`).
 *
 * Note: as of this version, nothing in `@sqb/connect` (no repository
 * command) actually invokes these listeners during a create/update/delete -
 * they're recorded but not currently triggered by insert/update/destroy
 * operations.
 *
 * @throws {Error} If applied to a symbol-keyed property.
 */
export function AfterDestroy(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'after-destroy', fn);
  };
}
