import {Operator} from '../Operator';
import {Serializable, serializeFallback, serializeObject} from '../../Serializable';
import {SerializeContext} from '../../types';
import {SerializationType} from '../../enums';
import {isSelectQuery} from '../../typeguards';

export abstract class CompOperator extends Operator {

    _expression: Serializable | string;
    _value?: any | Serializable;
    _symbol?: string;

    protected constructor(expression: string | Serializable, value?: any) {
        super();
        this._expression = expression;
        this._value = value;
    }

    get _type(): SerializationType {
        return SerializationType.COMPARISON_EXPRESSION;
    }

    _serialize(ctx: SerializeContext): string {
        const left = this._expression instanceof Serializable ?
            this._expression._serialize(ctx) : this._expression;
        const o: any = {
            operatorType: this._operatorType,
            left: isSelectQuery(this._expression) ?
                '(' + left + ')' : left,
            symbol: this._symbol,
            right: this._value
        };

        return this.__serialize(ctx, o);
    }

    protected __serialize(ctx: SerializeContext, o: any): string {
        let value = serializeObject(ctx, o.right);
        if (isSelectQuery(o.right))
            value = '(' + value + ')';
        o.right = value;
        return serializeFallback(ctx, this._type, o,
            (_ctx: SerializeContext, _o) => this.__defaultSerialize(_ctx, _o));
    }

    protected __defaultSerialize(ctx: SerializeContext, o: any): string {
        return (Array.isArray(o.expression) ?
            '(' + o.left.join(',') + ')' : o.left) +
            ' ' + o.symbol + ' ' + o.right;
    }

}