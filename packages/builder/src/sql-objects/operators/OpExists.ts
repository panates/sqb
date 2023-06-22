import {OperatorType} from '../../enums';
import {SelectQuery} from '../../query/SelectQuery';
import {CompOperator} from './CompOperator';
import {isSelectQuery} from '../../typeguards';
import {SerializeContext} from '../../SerializeContext';

export class OpExists extends CompOperator {

    _operatorType = OperatorType.exists;
    _symbol = 'exists';

    constructor(query: SelectQuery) {
        super(query);
        if (!(typeof query === 'object' && isSelectQuery(query)))
            throw new TypeError('You must provide a SelectQuery in `exists()`');
    }

    _serialize(ctx: SerializeContext): string {
        const left = this.__serializeItem(ctx, this._expression);
        if (this._isArray)
            left.isArray = true;
        const o: any = {
            operatorType: this._operatorType,
            symbol: this._symbol,
            left
        };
        return this.__serialize(ctx, o);
    }

    protected __defaultSerialize(ctx: SerializeContext, o) {
        return o.left.expression ? o.symbol + ' ' + o.left.expression : '';
    }

}
