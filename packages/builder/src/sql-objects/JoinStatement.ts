import {Serializable, serializeFallback} from '../Serializable';
import {JoinType, SerializationType} from '../enums';
import {TableName} from './TableName';
import {SelectQuery} from '../query/SelectQuery';
import {RawStatement} from './RawStatement';
import {OpAnd} from './operators/OpAnd';
import {SerializeContext} from '../types';
import {LogicalOperator} from './operators/LogicalOperator';
import {isRawStatement, isSelectQuery, isTableName} from '../typeguards';

export class JoinStatement extends Serializable {

    _joinType: JoinType;
    _table: TableName | SelectQuery | RawStatement;
    _conditions: LogicalOperator = new OpAnd();

    constructor(joinType: JoinType, table: string | TableName | SelectQuery | RawStatement) {
        super();
        // noinspection SuspiciousTypeOfGuard
        if (!(isSelectQuery(table) || isRawStatement(table) || isTableName(table) ||
            typeof table === 'string')
        )
            throw new TypeError('Table name, select query or raw object required for Join');
        this._joinType = joinType;
        this._table = typeof table === 'string' ? new TableName(table) : table;
    }

    get _type(): SerializationType {
        return SerializationType.JOIN;
    }

    on(...conditions: Serializable[]): this {
        this._conditions.add(...conditions);
        return this;
    }

    _serialize(ctx: SerializeContext): string {
        const o = {
            joinType: this._joinType,
            table: this._table._serialize(ctx),
            conditions: this.__serializeConditions(ctx, this)
        };
        return serializeFallback(ctx, this._type, o, () => {
            let out;
            switch (this._joinType) {
                case JoinType.LEFT:
                    out = 'left join';
                    break;
                case JoinType.LEFT_OUTER:
                    out = 'left outer join';
                    break;
                case JoinType.RIGHT:
                    out = 'right join';
                    break;
                case JoinType.RIGHT_OUTER:
                    out = 'right outer join';
                    break;
                case JoinType.OUTER:
                    out = 'outer join';
                    break;
                case JoinType.FULL_OUTER:
                    out = 'full outer join';
                    break;
                default:
                    out = 'inner join';
                    break;
            }
            const lf = o.table.length > 40;
            if (isSelectQuery(this._table)) {
                const alias = (this._table as SelectQuery)._alias;
                if (!alias)
                    throw new Error('Alias required for sub-select in Join');
                out += ' (' + (lf ? '\n\t' : '') + o.table + (lf ? '\n\b' : '') + ')' +
                    ' ' + alias;
            } else
                out += ' ' + o.table;

            if (o.conditions)
                out += ' ' + o.conditions;

            return out + (lf ? '\b' : '');
        });
    }

    protected __serializeConditions(ctx, join: JoinStatement) {
        if (join._conditions._items.length) {
            const s = join._conditions._serialize(ctx);
            return serializeFallback(ctx, SerializationType.JOIN_CONDITIONS, s,
                () => s ? 'on ' + s : '');
        }
        return '';
    }

}
