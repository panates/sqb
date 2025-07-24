import { EntityMetadata } from '../model/entity-metadata.js';

export function BeforeInsert(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'before-insert', fn);
  };
}

export function BeforeUpdate(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'before-update', fn);
  };
}

export function BeforeDestroy(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'before-destroy', fn);
  };
}

export function AfterInsert(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'after-insert', fn);
  };
}

export function AfterUpdate(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'after-update', fn);
  };
}

export function AfterDestroy(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const model = EntityMetadata.define(target.constructor);
    const fn = target.constructor.prototype[propertyKey];
    EntityMetadata.addEventListener(model, 'after-destroy', fn);
  };
}
