import { And, In, Param, Select, TableName } from '@sqb/builder';
import type { SqbConnection } from '../../client/sqb-connection.js';
import { isAssociationNode } from '../../type-guards.js';
import { AssociationNode } from '../model/association-node.js';
import type { ColumnFieldMetadata } from '../model/column-field-metadata.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import type { Repository } from '../repository.class.js';
import {
  isAssociationField,
  isColumnField,
  isEmbeddedField,
  resolveEntityForEmbeddedField,
} from '../util/orm.helper.js';
import {
  FieldsProjection,
  parseFieldsProjection,
} from '../util/parse-fields-projection.js';
import {
  joinAssociationGetLast,
  type JoinInfo,
  prepareFilter,
} from './command.helper.js';
import { RowConverter } from './row-converter.js';

export type FindCommandArgs = {
  entity: EntityMetadata;
  connection: SqbConnection;
} & Repository.FindManyOptions;

const SORT_ORDER_PATTERN = /^([-+])?(.*)$/;

/**
 * Static-only implementation of `Repository.findById()`/`findOne()`/`findMany()`/
 * `exists()`/`existsOne()`: incrementally builds a `SELECT` query (columns,
 * joins for to-one associations, filter, sort) plus a {@link RowConverter}
 * that reshapes flat result rows back into (possibly nested) entity
 * objects, then executes it. Can also be created rooted at an
 * {@link AssociationNode} (used internally by `Repository`'s own association
 * eager-loading) rather than a bare entity.
 */
export class FindCommand {
  /** Row-count cap for a to-many eager-loaded association at any single level (see {@link Repository.FindManyOptions.maxEagerFetch}). */
  maxEagerFetch: number = 100000;
  /** Remaining depth of to-many eager-loaded associations this command will still follow (see {@link Repository.FindManyOptions.maxSubQueries}). */
  maxSubQueries: number = 5;
  /** The entity the main `SELECT ... FROM` targets. */
  readonly mainEntity: EntityMetadata;
  /** The entity result rows are shaped as (equal to `mainEntity` unless this command was created rooted at an association chain). */
  readonly resultEntity: EntityMetadata;
  /** Builds output objects from result rows; also the target for `addFields`' column/join wiring. */
  readonly converter: RowConverter;
  /** SQL alias of `mainEntity`'s table. */
  readonly mainAlias: string = 'T';
  /** SQL alias of `resultEntity`'s table (equal to `mainAlias` unless rooted at an association chain, in which case it's the alias of the chain's last join). */
  resultAlias: string = 'T';
  private _joins: JoinInfo[] = [];
  private _selectColumns: Record<
    string,
    {
      statement: string;
      field: ColumnFieldMetadata;
    }
  > = {};
  private _filter = And();
  private _sort?: string[];

  protected constructor(
    selectEntity: EntityMetadata,
    outputEntity: EntityMetadata,
  ) {
    this.mainEntity = selectEntity;
    this.resultEntity = outputEntity;
    this.converter = new RowConverter(outputEntity.ctor);
  }

  /**
   * Creates a command rooted at a plain entity, or (internally, for
   * eager-loading a to-many association) at an {@link AssociationNode} - in
   * the latter case, the chain's own filter/join is applied immediately and
   * `resultAlias` is set to the chain's last hop.
   *
   * @throws {Error} If the listing entity isn't `@Entity`-decorated.
   */
  static async create(
    source: EntityMetadata | AssociationNode,
    opts: {
      maxSubQueries?: number;
      maxEagerFetch?: number;
    } = {},
  ): Promise<FindCommand> {
    let command: FindCommand;
    let listingEntity: EntityMetadata;
    if (isAssociationNode(source)) {
      const node = source;
      listingEntity = await node.resolveTarget();
      const resultEntity = await node.getLast().resolveTarget();
      command = new FindCommand(listingEntity, resultEntity);
      if (node.conditions) await command.filter(node.conditions);
      if (node.next) {
        const join = await joinAssociationGetLast(
          command._joins,
          node.next,
          command.mainAlias,
        );
        command.resultAlias = join.joinAlias;
      }
    } else {
      listingEntity = source;
      command = new FindCommand(listingEntity, listingEntity);
    }
    if (!listingEntity.tableName)
      throw new Error(
        `${listingEntity.ctor.name} is not decorated with @Entity decorator`,
      );
    if (typeof opts.maxSubQueries === 'number')
      command.maxSubQueries = opts.maxSubQueries;
    if (typeof opts.maxEagerFetch === 'number')
      command.maxEagerFetch = opts.maxEagerFetch;
    return command;
  }

  /** Creates a command for `args.entity`, wires up its projection/filter/sort, and executes it. */
  static async execute(args: FindCommandArgs): Promise<any[]> {
    const command = await FindCommand.create(args.entity, {
      maxSubQueries: args.maxSubQueries,
      maxEagerFetch: args.maxEagerFetch,
    });

    await command.addFields({
      projection: args.projection,
      sort: args.sort,
    });

    if (args.filter) await command.filter(args.filter);
    if (args.sort) await command.sort(args.sort);

    return await command.execute(args);
  }

  /**
   * Walks `opts.entity`'s (default: `resultEntity`'s) fields, applying
   * `opts.projection` to decide which to include, and for each included
   * field: a column is added to the `SELECT` list and `converter`; an
   * embedded field recurses with its own sub-converter and name
   * prefix/suffix; a to-one association is joined and recurses into the
   * joined entity's fields; and a to-many association (if
   * `maxSubQueries > 0`) becomes a separate nested {@link FindCommand}
   * (added to `converter` as a nested property, resolved after the main
   * query via {@link RowConverter._iterateForNested}) filtered to the
   * parent rows already selected.
   */
  async addFields(
    opts: {
      tableAlias?: string;
      converter?: RowConverter;
      entity?: EntityMetadata;
      projection?: FieldsProjection | string | string[];
      sort?: string[];
      prefix?: string;
      suffix?: string;
    } = {},
  ): Promise<void> {
    const tableAlias = opts.tableAlias || this.resultAlias;
    const entity = opts.entity || this._getEntityFromAlias(tableAlias);
    const converter = opts.converter || this.converter;

    const projection =
      typeof opts.projection === 'string' || Array.isArray(opts.projection)
        ? parseFieldsProjection(opts.projection)
        : opts.projection;
    const defaultFields =
      !projection || !Object.values(projection).find(p => !p.sign);

    const sortFields =
      opts.sort && opts.sort.length
        ? opts.sort.map(x => x.toLowerCase())
        : undefined;
    const prefix = opts.prefix || '';
    const suffix = opts.suffix || '';

    for (const key of Object.keys(entity.fields)) {
      const col = EntityMetadata.getField(entity, key);
      if (!col || col.hidden) continue;
      const colNameLower = col.name.toLowerCase();
      const p = projection?.[colNameLower];
      if (
        /** Ignore if field is omitted */
        p?.sign === '-' ||
        /** Ignore if default fields and field is not in projection */
        (!defaultFields && !p) ||
        /** Ignore if default fields enabled and fields is exclusive */
        (defaultFields && col.exclusive && !p)
      ) {
        continue;
      }

      // Add field to select list if field is a column
      if (isColumnField(col)) {
        const fieldAlias = this._selectColumn(tableAlias, col, prefix, suffix);
        // Add column to converter
        converter.addValueProperty({
          name: col.name,
          fieldAlias,
          dataType: col.dataType,
          parse: col.parse,
        });
        continue;
      }

      if (isEmbeddedField(col)) {
        const typ = await resolveEntityForEmbeddedField(col);
        const subConverter = converter.addObjectProperty({
          name: col.name,
          type: typ.ctor,
        }).converter;
        await this.addFields({
          tableAlias,
          converter: subConverter,
          entity: typ,
          prefix: col.fieldNamePrefix,
          suffix: col.fieldNameSuffix,
          projection: p?.projection,
          sort: extractSubFields(colNameLower, sortFields),
        });
        continue;
      }

      if (isAssociationField(col)) {
        // OtO relation
        if (!col.association.returnsMany()) {
          const joinInfo = await joinAssociationGetLast(
            this._joins,
            col.association,
            tableAlias,
          );
          const subConverter = converter.addObjectProperty({
            name: col.name,
            type: joinInfo.targetEntity.ctor,
          }).converter;
          // Add join fields to select columns list
          await this.addFields({
            tableAlias: joinInfo.joinAlias,
            converter: subConverter,
            entity: joinInfo.targetEntity,
            projection: p?.projection,
            sort: extractSubFields(colNameLower, sortFields),
          });
          continue;
        }

        // One-2-Many Eager relation
        if (this.maxSubQueries > 0) {
          const targetCol = await col.association.resolveTargetProperty();
          const sourceCol = await col.association.resolveSourceProperty();
          // We need to know key value to filter sub query.
          // So add key field into select columns
          const parentField = this._selectColumn(tableAlias, sourceCol);

          const findCommand = await FindCommand.create(col.association, {
            maxSubQueries: this.maxSubQueries - 1,
            maxEagerFetch: this.maxEagerFetch,
          });
          findCommand.converter.parent = converter;
          await findCommand.filter(In(targetCol.name, Param(parentField)));
          const sort = sortFields && extractSubFields(colNameLower, sortFields);
          await findCommand.addFields({
            projection: p?.projection,
            sort,
          });
          if (sort) await findCommand.sort(sort);
          const keyField = findCommand._selectColumn(
            findCommand.mainAlias,
            targetCol,
          );

          const resultType = await col.association.getLast().resolveTarget();
          converter.addNestedProperty({
            name: col.name,
            type: resultType.ctor,
            findCommand,
            parentField,
            keyField,
            sort: extractSubFields(colNameLower, sortFields),
          });
        }
      }
    }
  }

  /** Adds one column to the `SELECT` list (as `<table>.<field> as <alias>`, alias capped at 30 chars) and returns its alias. */
  private _selectColumn(
    tableAlias: string,
    el: ColumnFieldMetadata,
    prefix?: string,
    suffix?: string,
  ): string {
    const fieldName =
      (prefix || '').toLowerCase() +
      el.fieldName.toUpperCase() +
      (suffix || '').toLowerCase();
    const fieldAlias = (tableAlias + '_' + fieldName).substring(0, 30);
    this._selectColumns[fieldAlias] = {
      field: el,
      statement: tableAlias + '.' + fieldName + ' as ' + fieldAlias,
    };
    return fieldAlias;
  }

  /** Adds `WHERE` conditions, translated from an entity-level `filter` via `prepareFilter`. */
  async filter(filter: any): Promise<void> {
    await prepareFilter(this.mainEntity, filter, this._filter);
  }

  /**
   * Sets the `ORDER BY` clause from entity-level sort field paths (each
   * optionally `-`/`+`-prefixed for descending/ascending), resolving dotted
   * paths through embedded fields (adjusting name prefix/suffix) and
   * to-one associations (joining as needed); a path through a to-many
   * association is silently dropped (sorting by a multi-row relation isn't
   * meaningful for the parent row).
   *
   * @throws {Error} If a sort path doesn't resolve to a real, sortable (column) field.
   */
  async sort(sortFields: string[]): Promise<void> {
    const out: string[] = [];
    for (const item of sortFields) {
      const m = item.match(SORT_ORDER_PATTERN);
      if (!m) throw new Error(`"${item}" is not a valid order expression`);

      let elName = m[2];
      let prefix = '';
      let suffix = '';
      let _entityDef = this.resultEntity;
      let tableAlias = this.resultAlias;
      if (elName.includes('.')) {
        const a: string[] = elName.split('.');
        while (a.length > 1) {
          const col = EntityMetadata.getField(_entityDef, a.shift() || '');
          if (isEmbeddedField(col)) {
            _entityDef = await resolveEntityForEmbeddedField(col);
            if (col.fieldNamePrefix) prefix += col.fieldNamePrefix;
            if (col.fieldNameSuffix) suffix = col.fieldNameSuffix + suffix;
          } else if (isAssociationField(col)) {
            if (col.association.returnsMany()) {
              elName = '';
              break;
            }
            const joinInfo = await joinAssociationGetLast(
              this._joins,
              col.association,
              tableAlias,
            );
            tableAlias = joinInfo.joinAlias;
            _entityDef = joinInfo.targetEntity;
          } else
            throw new Error(
              `Invalid column (${elName}) declared in sort property`,
            );
        }
        if (!elName) continue;
        elName = a.shift() || '';
      }
      const col = EntityMetadata.getField(_entityDef, elName);
      if (!col)
        throw new Error(`Unknown field (${elName}) declared in sort property`);
      if (!isColumnField(col))
        throw new Error(
          `Can not sort by "${elName}", because it is not a data column`,
        );

      const dir = m[1] || '+';
      out.push(
        (dir || '') + tableAlias + '.' + prefix + col.fieldName + suffix,
      );
    }
    this._sort = out;
  }

  /**
   * Assembles the final `SELECT` (columns, `FROM`, `WHERE`, `ORDER BY`,
   * `OFFSET`, then joins last), executes it, and converts the resulting
   * rows via `converter` (which also triggers any nested to-many
   * eager-fetch sub-commands).
   */
  async execute(
    args: Pick<
      FindCommandArgs,
      | 'connection'
      | 'distinct'
      | 'offset'
      | 'limit'
      | 'params'
      | 'onTransformRow'
      | 'prettyPrint'
      | 'comment'
      | 'optimizerHint'
    >,
  ): Promise<any[]> {
    // Generate select query
    const columnSqls = Object.keys(this._selectColumns).map(
      x => this._selectColumns[x].statement,
    );
    if (!columnSqls.length) columnSqls.push('1');

    const query = Select(...columnSqls).from(
      TableName({
        table: this.mainEntity.tableName!,
        alias: this.mainAlias,
        optimizerHint: args.optimizerHint,
      }),
    );

    if (args.comment) {
      if (Array.isArray(args.comment))
        args.comment.forEach(c => query.comment(c));
      else query.comment(args.comment as any);
    }

    if (args.distinct) query.distinct();

    query.where(...this._filter._items);

    if (this._sort) {
      query.orderBy(...this._sort);
    }
    if (args.offset) query.offset(args.offset);

    // joins must be added last
    if (this._joins) {
      for (const j of this._joins) {
        query.join(j.join);
      }
    }

    // Execute query
    const resp = await args.connection.execute(query, {
      params: args?.params,
      fetchRows: args?.limit,
      objectRows: false,
      cursor: false,
      prettyPrint: args.prettyPrint,
    });

    // Create objects
    if (resp.rows && resp.fields) {
      return this.converter.transform(
        args.connection,
        resp.fields,
        resp.rows,
        args.onTransformRow,
      );
    }
    return [];
  }

  /**
   * Resolves a SQL table alias (`mainAlias`, `resultAlias`, or a joined
   * association's alias) back to the entity it refers to.
   *
   * @throws {Error} If `tableAlias` doesn't match any known table alias.
   */
  private _getEntityFromAlias(tableAlias: string): EntityMetadata {
    if (tableAlias === this.mainAlias) return this.mainEntity;
    if (tableAlias === this.resultAlias) return this.resultEntity;
    if (this._joins) {
      const join = this._joins.find(j => j.joinAlias === tableAlias);
      if (join) return join.targetEntity;
    }
    throw new Error(`Unknown table alias "${tableAlias}"`);
  }
}

/** Extracts the sub-paths of `fields` nested under `colNameLower` (e.g. `'city'` out of `'address.city'`), for passing a sort/projection down into a nested `addFields`/`sort` call. */
function extractSubFields(
  colNameLower: string,
  fields?: string[],
): string[] | undefined {
  if (!(fields && fields.length)) return;
  if (fields) {
    return fields.reduce((trg: string[], v: string) => {
      if (v.startsWith(colNameLower + '.'))
        trg.push(v.substring(colNameLower.length + 1).toLowerCase());
      return trg;
    }, [] as string[]);
  }
}
