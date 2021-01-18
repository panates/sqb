import {EntityDefinition} from '../EntityDefinition';

export function BeforeInsert(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol): void => {
        if (typeof propertyKey !== 'string')
            throw new Error('You can define a Column for only string properties');
        const entity = EntityDefinition.attach(target.constructor);
        const fn = target.constructor.prototype[propertyKey]
        if (typeof fn !== 'function')
            throw new Error('Property must be a function');
        entity.beforeInsert(fn);
    }
}

export function BeforeUpdate(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol): void => {
        if (typeof propertyKey !== 'string')
            throw new Error('You can define a Column for only string properties');
        const entity = EntityDefinition.attach(target.constructor);
        const fn = target.constructor.prototype[propertyKey]
        if (typeof fn !== 'function')
            throw new Error('Property must be a function');
        entity.beforeUpdate(fn);
    }
}

export function BeforeDestroy(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol): void => {
        if (typeof propertyKey !== 'string')
            throw new Error('You can define a Column for only string properties');
        const entity = EntityDefinition.attach(target.constructor);
        const fn = target.constructor.prototype[propertyKey]
        if (typeof fn !== 'function')
            throw new Error('Property must be a function');
        entity.beforeDestroy(fn);
    }
}

export function AfterInsert(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol): void => {
        if (typeof propertyKey !== 'string')
            throw new Error('You can define a Column for only string properties');
        const entity = EntityDefinition.attach(target.constructor);
        const fn = target.constructor.prototype[propertyKey]
        if (typeof fn !== 'function')
            throw new Error('Property must be a function');
        entity.afterInsert(fn);
    }
}

export function AfterUpdate(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol): void => {
        if (typeof propertyKey !== 'string')
            throw new Error('You can define a Column for only string properties');
        const entity = EntityDefinition.attach(target.constructor);
        const fn = target.constructor.prototype[propertyKey]
        if (typeof fn !== 'function')
            throw new Error('Property must be a function');
        entity.afterUpdate(fn);
    }
}

export function AfterDestroy(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol): void => {
        if (typeof propertyKey !== 'string')
            throw new Error('You can define a Column for only string properties');
        const entity = EntityDefinition.attach(target.constructor);
        const fn = target.constructor.prototype[propertyKey]
        if (typeof fn !== 'function')
            throw new Error('Property must be a function');
        entity.afterDestroy(fn);
    }
}