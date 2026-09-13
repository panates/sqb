import { EntityMetadata } from '../model/entity-metadata.js';
import { isColumnField } from './orm.helper.js';

/**
 * Extracts an entity's primary-key column/value pairs from either a bare
 * key value (single-column primary key only) or a `{ column: value, ... }`
 * object, used by `Repository`'s single-record operations
 * (`findById`/`update`/`delete`/etc.) to build their `WHERE` filter.
 *
 * @param entityDef - The entity whose primary key is being extracted.
 * @param valueOrInstance - The raw key value (single-column key), or an object/entity instance carrying the key column(s).
 * @param keepOther - When true, also copies through any other own-properties of `valueOrInstance` alongside the key columns.
 * @throws {Error} If the entity has no primary key, a primary-key column isn't a real data column, or (for a multi-column key) `valueOrInstance` is missing a required key column's value.
 */
export function extractKeyValues<T>(
  entityDef: EntityMetadata,
  valueOrInstance: any | Record<string, any> | T,
  keepOther?: boolean,
): Record<string, any> {
  const primaryIndex = EntityMetadata.getPrimaryIndex(entityDef);
  if (!primaryIndex)
    throw new Error(`No primary fields defined for "${entityDef.name}" entity`);

  const validateCol = k => {
    const col = EntityMetadata.getField(entityDef, k);
    if (!col)
      throw new Error(
        `Unknown column (${k}) defined as primary key in entity "${entityDef.name}"`,
      );
    if (!isColumnField(col)) {
      throw new Error(
        `Column (${k}) defined as primary key in entity "${entityDef.name}" is not a data column`,
      );
    }
  };

  // if entity's primary key has more than one key field
  if (primaryIndex.columns.length > 1) {
    if (typeof valueOrInstance !== 'object') {
      throw new Error(
        `"${entityDef.name}" entity` +
          ` has more than one primary key field and you must provide all values with an key/value pair`,
      );
    }

    const valueKeys = Object.keys(valueOrInstance);
    const valueKeysUpper = valueKeys.map(x => x.toUpperCase());

    const out: Record<string, any> = {};
    for (const k of primaryIndex.columns) {
      const i = valueKeysUpper.indexOf(k.toUpperCase());
      if (i < 0)
        throw new Error(
          `Value of key field "${entityDef.name}.${k}" required to perform this operation`,
        );
      validateCol(k);
      out[k] = valueOrInstance[valueKeys[i]];
    }
    if (keepOther) {
      for (let i = 0; i < valueKeys.length; i++) {
        if (
          primaryIndex.columns.find(x => x.toUpperCase() === valueKeysUpper[i])
        )
          continue;
        out[valueKeys[i]] = valueOrInstance[valueKeys[i]];
      }
    }
    return out;
  }

  const primaryColumnName = primaryIndex.columns[0];
  validateCol(primaryColumnName);
  if (typeof valueOrInstance === 'object') {
    const valueKeys = Object.keys(valueOrInstance);
    const valueKeysUpper = valueKeys.map(x => x.toUpperCase());
    const k = valueKeysUpper.indexOf(primaryColumnName.toUpperCase());
    if (k < 0) {
      throw new Error(
        `Value of key field "${entityDef.name}.${primaryColumnName}" required to perform this operation`,
      );
    }
    const out = { [primaryColumnName]: valueOrInstance[valueKeys[k]] };
    if (keepOther) {
      for (let i = 0; i < valueKeys.length; i++) {
        if (
          primaryIndex.columns.find(x => x.toUpperCase() === valueKeysUpper[i])
        )
          continue;
        out[valueKeys[i]] = valueOrInstance[valueKeys[i]];
      }
    }
    return out;
  }

  return { [primaryColumnName]: valueOrInstance };
}
