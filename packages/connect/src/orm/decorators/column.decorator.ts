import { DataType } from '@sqb/builder';
import { ColumnFieldOptions } from '../model/column-field-metadata.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import { DECORATOR_FACTORY } from '../orm.const.js';

export function Column(type?: DataType): PropertyDecorator;
export function Column(options?: ColumnFieldOptions): PropertyDecorator;
export function Column(arg0): PropertyDecorator {
  return Column[DECORATOR_FACTORY](arg0);
}

Column[DECORATOR_FACTORY] = function (arg0: any): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('Symbol properties are not accepted');
    const options =
      (typeof arg0 === 'string' ? { dataType: arg0 } : arg0) || {};
    const entity = EntityMetadata.define(target.constructor);

    if (!options.type) {
      const typ = Reflect.getMetadata(
        'design:type',
        entity.ctor.prototype,
        propertyKey,
      );
      if (typ === Array) {
        options.type = String;
        options.isArray = true;
      } else options.type = typ;
    }

    if (
      !options.dataType &&
      typeof options.type === 'function' &&
      EntityMetadata.get(options.type)
    ) {
      options.dataType = DataType.JSON;
    }

    EntityMetadata.defineColumnField(entity, propertyKey, options);
  };
};
