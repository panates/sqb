import {Type} from 'ts-gems';
import {AssociationFieldOptions} from '../model/association-field-metadata.js';
import {EntityMetadata} from '../model/entity-metadata.js';
import {LinkChain} from '../model/link-chain.js';
import {TypeThunk} from '../orm.type.js';

type LinkArgs<T> = {
    sourceKey?: string,
    targetKey?: keyof T
    where?: object | object[];
}

type LinkPropertyDecorator = PropertyDecorator & {

    toOne<T>(type: TypeThunk<T>, args?: LinkArgs<T>): LinkPropertyDecorator;

    toMany<T>(type: TypeThunk<T>, args?: LinkArgs<T>): LinkPropertyDecorator;
}

export function Link(options?: AssociationFieldOptions): LinkPropertyDecorator {

    let root: LinkChain<any>;
    let chain: LinkChain<any>;

    const fn: LinkPropertyDecorator = (target: Object, propertyKey: string | symbol): void => {
        if (typeof propertyKey !== 'string')
            throw new TypeError('Symbol properties are not allowed');
        const reflectType = Reflect.getMetadata("design:type", target, propertyKey);
      if (!reflectType)
        throw new TypeError(`Can not access design type info. You must enable "emitDecoratorMetadata" in tsconfig`);
        if (!root) {
            if (reflectType === Array)
                throw new TypeError(`Can't get type information while it is an array. Please define entity type`);
            if (!EntityMetadata.get(reflectType))
                throw new TypeError(`No entity metadata found for type "${reflectType}"`);
            fn.toOne(reflectType);
        }
        if (reflectType !== Array && root.first.returnsMany())
            throw new TypeError(`Link returns single instance however property type is an array`);
        if (reflectType === Array && !root.first.returnsMany())
            throw new TypeError(`Link returns array of instances however property type is not an array`);
        const entity = EntityMetadata.define(target.constructor as Type);
        // @ts-ignore
        // noinspection JSConstantReassignment
        root.first.source = entity.ctor;
        EntityMetadata.defineAssociationField(entity, propertyKey, root.first, options);
    };

    fn.toOne = <T>(type: TypeThunk<T>, args?: LinkArgs<T>) => {
        if (chain) {
            chain = chain.linkToOne(type, args?.targetKey, args?.sourceKey);
            if (args?.where)
                chain.where(args.where);
            return fn;
        }
        root = linkToOne(type, args?.targetKey, args?.sourceKey);
        chain = root;
        if (args?.where)
            chain.where(args.where);
        return fn;
    }

    fn.toMany = <T>(type: TypeThunk<T>, args?: LinkArgs<T>) => {
        if (chain) {
            chain = chain.linkToMany(type, args?.targetKey, args?.sourceKey);
            if (args?.where)
                chain.where(args.where);
            return fn;
        }
        root = linkToMany(type, args?.targetKey, args?.sourceKey);
        chain = root;
        if (args?.where)
            chain.where(args.where);
        return fn;
    }
    return fn;
}

/**
 * Crates an Link Chain object
 */
function linkToOne<T>(type: TypeThunk<T>, targetKey?: keyof T, sourceKey?: string): LinkChain<T> {
    return new LinkChain<T>(type, targetKey, sourceKey);
}

/**
 * Crates an Link Chain object
 */
function linkToMany<T>(type: TypeThunk<T>, targetKey?: keyof T, sourceKey?: string): LinkChain<T> {
    return new LinkChain<T>(type, targetKey, sourceKey, true);
}
