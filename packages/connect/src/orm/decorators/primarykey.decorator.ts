import { EntityMetadata } from '../model/entity-metadata.js';
import { IndexMetadata } from '../model/index-metadata.js';
import { Column } from './column.decorator.js';

export function PrimaryKey(
  fields: string | string[],
  options?: Omit<IndexMetadata, 'columns' | 'unique' | 'primary'>,
): ClassDecorator;
export function PrimaryKey(
  options?: Omit<IndexMetadata, 'columns' | 'unique' | 'primary'>,
): PropertyDecorator;
export function PrimaryKey(
  arg0: any,
  arg1?: any,
): ClassDecorator | PropertyDecorator {
  return function (target, propertyKey?: string | symbol): void {
    if (arguments.length === 1) {
      if (!(typeof arg0 === 'string' || Array.isArray(arg0))) {
        throw new Error(`You must specify primary index column(s)`);
      }
      const meta = EntityMetadata.define(target);
      EntityMetadata.setPrimaryKeys(meta, arg0, arg1);
      return;
    }
    if (!target.constructor)
      throw new Error(
        'Property decorators can be used for class properties only',
      );
    if (typeof propertyKey !== 'string')
      throw new Error(
        'Index() decorator can be used for string property keys only',
      );
    const meta = EntityMetadata.define(target.constructor);
    Column({ notNull: true })(target, propertyKey);
    EntityMetadata.setPrimaryKeys(meta, propertyKey, arg0);
  };
}
