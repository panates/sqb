import {
  And,
  Eq,
  Exists,
  Field,
  InnerJoin,
  isCompOperator,
  isLogicalOperator,
  type Join,
  LeftOuterJoin,
  LogicalOperator,
  OperatorType,
  Or,
  Raw,
  Select,
} from '@sqb/builder';
import { AssociationNode } from '../model/association-node.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import {
  isAssociationField,
  isColumnField,
  isEmbeddedField,
  resolveEntityForEmbeddedField,
} from '../util/orm.helper.js';

/** One resolved `JOIN` clause added to a query for a hop of an association chain, cached in a command's `joinInfos` list so the same hop is never joined twice for the same parent alias. */
export interface JoinInfo {
  /** The association hop this join implements. */
  association: AssociationNode;
  sourceEntity: EntityMetadata;
  targetEntity: EntityMetadata;
  /** The alias assigned to the joined table (`J1`, `J2`, ...). */
  joinAlias: string;
  /** The alias of the table this join's `ON` condition references as its "parent" side. */
  parentAlias: string;
  /** The actual `@sqb/builder` `Join` element. */
  join: Join;
}

/**
 * Resolves (adding to `joinInfos`/the query as needed) every hop of
 * `association`'s chain, starting at `parentAlias`, and returns the first
 * hop's {@link JoinInfo}.
 */
export async function joinAssociationGetFirst(
  joinInfos: JoinInfo[],
  association: AssociationNode,
  parentAlias: string,
  innerJoin?: boolean,
): Promise<JoinInfo> {
  const joins = await joinAssociation(
    joinInfos,
    association,
    parentAlias,
    innerJoin,
  );
  return joins[0];
}

/**
 * Resolves (adding to `joinInfos`/the query as needed) every hop of
 * `association`'s chain, starting at `parentAlias`, and returns the last
 * hop's {@link JoinInfo}.
 */
export async function joinAssociationGetLast(
  joinInfos: JoinInfo[],
  association: AssociationNode,
  parentAlias: string,
  innerJoin?: boolean,
): Promise<JoinInfo> {
  const joins = await joinAssociation(
    joinInfos,
    association,
    parentAlias,
    innerJoin,
  );
  return joins[joins.length - 1];
}

/**
 * Walks `association`'s chain from `parentAlias`, reusing an already-joined
 * hop from `joinInfos` where possible and otherwise adding a new `JOIN`
 * (`LEFT OUTER JOIN` by default, `INNER JOIN` when `innerJoin` is set) with
 * its key columns matched and any hop-level `.where(...)` conditions
 * applied, mutating `joinInfos` as it goes.
 *
 * @returns Every hop's {@link JoinInfo}, in chain order.
 */
export async function joinAssociation(
  joinInfos: JoinInfo[],
  association: AssociationNode,
  parentAlias: string,
  innerJoin?: boolean,
): Promise<JoinInfo[]> {
  let joinInfo: JoinInfo | undefined;
  let node = association;
  const result: JoinInfo[] = [];
  while (node) {
    joinInfo = joinInfos.find(
      j => j.association === node && j.parentAlias === parentAlias,
    );
    if (!joinInfo) {
      const targetEntity = await node.resolveTarget();
      const sourceEntity = await node.resolveSource();
      const keyCol = await node.resolveSourceProperty();
      const targetCol = await node.resolveTargetProperty();

      const joinAlias = 'J' + (joinInfos.length + 1);
      const join = innerJoin
        ? InnerJoin(targetEntity.tableName + ' as ' + joinAlias)
        : LeftOuterJoin(targetEntity.tableName + ' as ' + joinAlias);
      join.on(
        Eq(
          Field(
            joinAlias + '.' + targetCol.fieldName,
            targetCol.dataType,
            targetCol.isArray,
          ),
          Field(
            parentAlias + '.' + keyCol.fieldName,
            keyCol.dataType,
            keyCol.isArray,
          ),
        ),
      );
      if (node.conditions)
        await prepareFilter(
          targetEntity,
          node.conditions,
          join._conditions,
          joinAlias,
        );

      joinInfo = {
        association: node,
        sourceEntity,
        targetEntity,
        parentAlias,
        joinAlias,
        join,
      };
      joinInfos.push(joinInfo);
    }
    result.push(joinInfo);
    if (!node.next) break;
    parentAlias = joinInfo.joinAlias;
    node = node.next;
  }
  return result;
}

/**
 * Translates an entity-level `filter` (a plain-object condition, a
 * `@sqb/builder` operator/operator tree, or an array of either) into
 * `@sqb/builder` operators appended onto `trgOp`, resolving each dotted
 * field path against the entity's metadata: a plain column becomes a
 * qualified `Field` reference; an embedded field's prefix/suffix is
 * threaded through; and an association field becomes either a `JOIN`
 * (to-one, adding to `trgOp`'s owning query via side effects on shared
 * state the caller must join in) or a correlated `EXISTS` sub-query
 * (to-many).
 *
 * @param entityDef - The entity `filter`'s field paths are resolved against.
 * @param filter - The filter to translate.
 * @param trgOp - The operator (matching `filter`'s own logical operator type, if any) that translated conditions are added to.
 * @param tableAlias - The SQL alias of `entityDef`'s own table in the query being built.
 * @throws {Error} If a filter key doesn't name a real field, or names one of the wrong kind for its position in the path.
 */
export async function prepareFilter(
  entityDef: EntityMetadata,
  filter: any,
  trgOp: LogicalOperator,
  tableAlias = 'T',
): Promise<void> {
  let srcOp: LogicalOperator;
  if (isLogicalOperator(filter) && filter._operatorType === trgOp._operatorType)
    srcOp = filter;
  else {
    srcOp = And();
    if (Array.isArray(filter)) srcOp.add(...filter);
    else srcOp.add(filter);
  }

  // const associationPathCache: Record<string, any> = {};
  for (const item of srcOp._items) {
    if (isLogicalOperator(item)) {
      const ctor = Object.getPrototypeOf(item).constructor;
      const logOp: LogicalOperator = new ctor();
      await prepareFilter(entityDef, item, logOp, tableAlias);
      trgOp.add(logOp);
      continue;
    }
    if (isCompOperator(item)) {
      if (typeof item._left === 'string') {
        const itemPath = item._left.split('.');
        const l = itemPath.length;

        let pt: string;
        let _curEntity = entityDef;
        let _curAlias = tableAlias;
        let _curPrefix = '';
        let _curSuffix = '';
        let subSelect: Select | undefined;
        let currentOp = trgOp;
        let i = 0;

        // const parentPath = itemPath
        //   .slice(0, l - 2)
        //   .join('.')
        //   .toLowerCase();
        // const cached = associationPathCache[parentPath];
        // if (cached) {
        //   /** Jump to last item */
        //   i = l - 1;
        //   _curEntity = cached._curEntity;
        //   _curAlias = cached._curAlias;
        //   currentOp = cached.currentOp;
        // }

        for (i; i < l; i++) {
          pt = itemPath[i];
          const col = EntityMetadata.getField(_curEntity, pt);
          if (!col)
            throw new Error(
              `Unknown property (${item._left}) defined in filter`,
            );
          /** if last item on path */
          if (i === l - 1) {
            if (!isColumnField(col))
              throw new Error(
                `Invalid column expression (${item._left}) defined in filter`,
              );
            const ctor = Object.getPrototypeOf(item).constructor;
            currentOp.add(
              new ctor(
                Field(
                  _curAlias + '.' + _curPrefix + col.fieldName + _curSuffix,
                  col.dataType,
                  col.isArray,
                ),
                item._right,
              ),
            );
          } else {
            /** if not last item on path */
            if (isColumnField(col))
              throw new Error(
                `Invalid column (${item._left}) defined in filter`,
              );
            if (isEmbeddedField(col)) {
              _curEntity = await resolveEntityForEmbeddedField(col);
              _curPrefix = _curPrefix + (col.fieldNamePrefix || '');
              _curSuffix = (col.fieldNameSuffix || '') + _curSuffix;
              continue;
            }
            if (!isAssociationField(col))
              throw new Error(
                `Invalid column (${item._left}) defined in filter`,
              );

            let node: AssociationNode | undefined;
            _curEntity = await col.association.resolveTarget();
            if (!subSelect) {
              const keyCol = await col.association.resolveSourceProperty();
              const targetCol = await col.association.resolveTargetProperty();
              subSelect = Select(Raw('1')).from(_curEntity.tableName + ' K');

              subSelect.where(
                Eq(
                  Field(
                    'K.' + targetCol.fieldName,
                    targetCol.dataType,
                    targetCol.isArray,
                  ),
                  Field(
                    tableAlias + '.' + keyCol.fieldName,
                    keyCol.dataType,
                    keyCol.isArray,
                  ),
                ),
              );
              currentOp.add(Exists(subSelect));
              if (currentOp._operatorType !== OperatorType.and) {
                currentOp = Or();
                subSelect.where(currentOp);
              } else currentOp = subSelect._where as LogicalOperator;
              if (col.association.conditions) {
                await prepareFilter(
                  _curEntity,
                  col.association.conditions,
                  trgOp,
                  'K',
                );
              }
              node = col.association.next;
              _curAlias = 'K';
            } else node = col.association;

            while (node) {
              const targetEntity = await node.resolveTarget();
              const sourceColumn = await node.resolveSourceProperty();
              const targetColumn = await node.resolveTargetProperty();
              const joinAlias = 'J' + ((subSelect?._joins?.length || 0) + 1);
              subSelect.join(
                InnerJoin(targetEntity.tableName + ' ' + joinAlias).on(
                  Eq(
                    Field(
                      joinAlias + '.' + targetColumn.fieldName,
                      targetColumn.dataType,
                      targetColumn.isArray,
                    ),
                    Field(
                      _curAlias + '.' + sourceColumn.fieldName,
                      sourceColumn.dataType,
                      sourceColumn.isArray,
                    ),
                  ),
                ),
              );
              _curEntity = targetEntity;
              _curAlias = joinAlias;
              node = node.next;
            }

            // /** If next path is the last one */
            // if (i === l - 2) {
            //   associationPathCache[parentPath] = {
            //     _curEntity,
            //     _curAlias,
            //     currentOp,
            //   };
            // }
          }
        }
        continue;
      }
    }
    trgOp.add(item);
  }
}
