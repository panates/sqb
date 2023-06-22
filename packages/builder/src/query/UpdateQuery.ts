import {SerializationType} from '../enums';
import {printArray} from '../helpers';
import {SerializeContext} from '../SerializeContext';
import {LogicalOperator} from '../sql-objects/operators/LogicalOperator';
import {OpAnd} from '../sql-objects/operators/OpAnd';
import {RawStatement} from '../sql-objects/RawStatement';
import {TableName} from '../sql-objects/TableName';
import {isRawStatement, isSelectQuery} from '../typeguards';
import {ReturningQuery} from './ReturningQuery';

export class UpdateQuery extends ReturningQuery {

    _table: TableName | RawStatement;
    _input: any;
    _where?: LogicalOperator;

    constructor(tableName: string | RawStatement, input: any) {
        super();
        if (!tableName || !(typeof tableName === 'string' || isRawStatement(tableName)))
            throw new TypeError('String or Raw instance required as first argument (tableName) for UpdateQuery');
        if (!input || !((typeof input === 'object' && !Array.isArray(input)) ||
            input.isSelect))
            throw new TypeError('Object or Raw instance required as second argument (input) for UpdateQuery');
        this._table = typeof tableName === 'string' ? new TableName(tableName) : tableName;
        this._input = input;
    }

    get _type(): SerializationType {
        return SerializationType.UPDATE_QUERY;
    }

    /**
     * Defines "where" part of query
     */
    where(...operator): this {
        this._where = this._where || new OpAnd();
        this._where.add(...operator);
        return this;
    }

    /**
     * Performs serialization
     */
    _serialize(ctx: SerializeContext): string {
        const o = {
            table: this._table._serialize(ctx),
            values: this.__serializeValues(ctx),
            where: this.__serializeWhere(ctx),
            returning: this.__serializeReturning(ctx)
        };
        let out = 'update ' + o.table + ' set \n\t' + o.values + '\b';
        if (o.where)
            out += '\n' + o.where;
        if (o.returning)
            out += '\n' + o.returning;
        return out;
    }

    /**
     *
     */
    protected __serializeValues(ctx: SerializeContext): string {
        const arr: { field: string, value: any }[] = [];
        const allValues = this._input;
        for (const n of Object.getOwnPropertyNames(allValues)) {
            const value = ctx.anyToSQL(allValues[n]);
            arr.push({
                field: n,
                value: isSelectQuery(allValues[n]) ? '(' + value + ')' : value
            });
        }
        return ctx.serialize(SerializationType.UPDATE_QUERY_VALUES, arr, () => {
            const a = arr.map(o => o.field + ' = ' + o.value);
            return printArray(a, ',');
        });
    }

    /**
     *
     */
    protected __serializeWhere(ctx: SerializeContext): string {
        if (!this._where)
            return '';
        const s = this._where._serialize(ctx);
        return ctx.serialize(SerializationType.CONDITIONS_BLOCK, s, () => {
            /* istanbul ignore next */
            return s ? 'where ' + s : '';
        });
    }

}
