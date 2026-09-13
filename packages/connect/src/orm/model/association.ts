import { camelCase } from 'putil-varhelpers';
import type { AssociationSettings, TypeThunk } from '../orm.type.js';
import { resolveEntityMeta } from '../util/orm.helper.js';
import type { ColumnFieldMetadata } from './column-field-metadata.js';
import type { EntityMetadata } from './entity-metadata.js';

/**
 * Describes a relation from one entity (`source`) to another (`target`),
 * backing both `@ForeignKey` declarations and each hop of a `@Link` chain
 * (via its {@link AssociationNode} subclass). `sourceKey`/`targetKey` are
 * declared eagerly but resolved lazily (`resolve*` methods) - if omitted,
 * resolution first tries to find a matching foreign key between the two
 * entities (in either direction) before falling back to
 * `<entityName>_<primaryKey>`-style convention.
 */
export class Association {
  private _resolved?: boolean;
  private _source?: EntityMetadata; // cached value
  private _target?: EntityMetadata; // cached value
  private _sourceKey?: string | null; // cached value
  private _targetKey?: string | null; // cached value
  private _sourceProperty?: ColumnFieldMetadata;
  private _targetProperty?: ColumnFieldMetadata;
  name: string;
  readonly source: TypeThunk;
  readonly target: TypeThunk;
  readonly sourceKey?: string;
  readonly targetKey?: string;
  /** Whether this association can resolve to more than one row (a to-many relation) rather than at most one (a to-one relation). */
  readonly many: boolean;

  constructor(name: string, args: AssociationSettings) {
    this.name = name;
    this.source = args.source;
    this.target = args.target;
    this.sourceKey = args.sourceKey;
    this.targetKey = args.targetKey;
    this.many = !!args.many;
  }

  /**
   * Resolves the source entity's metadata (following `source` if it's a lazy thunk).
   *
   * @throws {Error} If `source` doesn't resolve to an `@Entity`-decorated class.
   */
  async resolveSource(): Promise<EntityMetadata> {
    this._source = await resolveEntityMeta(this.source);
    if (!this._source)
      throw new Error(
        `Can't resolve source entity of association "${this.name}"`,
      );
    return this._source;
  }

  /**
   * Resolves the target entity's metadata (following `target` if it's a lazy thunk).
   *
   * @throws {Error} If `target` doesn't resolve to an `@Entity`-decorated class.
   */
  async resolveTarget(): Promise<EntityMetadata> {
    this._target = await resolveEntityMeta(this.target);
    if (!this._target)
      throw new Error(
        `Can't resolve target entity of association "${this.name}"`,
      );
    return this._target;
  }

  /** Resolves the source-side key column name, applying the foreign-key/convention fallback described on the class if it wasn't given explicitly. */
  async resolveSourceKey(): Promise<string> {
    await this._resolveKeys();
    // @ts-ignore
    return this._sourceKey;
  }

  /** Resolves the source-side key column's field metadata. */
  async resolveSourceProperty(): Promise<ColumnFieldMetadata> {
    await this._resolveKeys();
    // @ts-ignore
    return this._sourceProperty;
  }

  /** Resolves the target-side key column name, applying the foreign-key/convention fallback described on the class if it wasn't given explicitly. */
  async resolveTargetKey(): Promise<string> {
    await this._resolveKeys();
    // @ts-ignore
    return this._targetKey;
  }

  /** Resolves the target-side key column's field metadata. */
  async resolveTargetProperty(): Promise<ColumnFieldMetadata> {
    await this._resolveKeys();
    // @ts-ignore
    return this._targetProperty;
  }

  /** Whether this association can resolve to more than one row. */
  returnsMany(): boolean {
    return this.many;
  }

  /**
   * Resolves and caches `_sourceKey`/`_targetKey` (and their column
   * metadata): reuses an explicit `sourceKey`/`targetKey` if both were
   * given, otherwise looks for a matching foreign key between the source
   * and target entities (checked in both directions), and failing that,
   * falls back to `<entityName>_<primaryKeyColumn>`-style convention (in
   * camelCase if the plain snake_case form isn't a real column). A no-op if
   * already resolved.
   *
   * @throws {Error} If the resolved key doesn't name a real column on the corresponding entity.
   */
  protected async _resolveKeys(): Promise<void> {
    const { EntityMetadata } = await import('../model/entity-metadata.js');
    if (this._resolved) return;
    const source = await this.resolveSource();
    const target = await this.resolveTarget();
    let sourceKey = this.sourceKey || '';
    let targetKey = this.targetKey || '';

    if (!(sourceKey && targetKey)) {
      // Try to determine key fields from foreign key from source to target
      let foreign = await EntityMetadata.getForeignKeyFor(source, target);
      if (foreign && foreign !== this) {
        await foreign._resolveKeys();
        this._sourceKey = foreign._sourceKey;
        this._sourceProperty = foreign._sourceProperty;
        this._targetKey = foreign._targetKey;
        this._targetProperty = foreign._targetProperty;
        this._resolved = true;
        return;
      }
      // Try to determine key fields from foreign key from target to source
      foreign = await EntityMetadata.getForeignKeyFor(target, source);
      if (foreign && foreign !== this) {
        await foreign._resolveKeys();
        this._sourceKey = foreign._targetKey;
        this._sourceProperty = foreign._targetProperty;
        this._targetKey = foreign._sourceKey;
        this._targetProperty = foreign._sourceProperty;
        this._resolved = true;
        return;
      }

      if (this.many) {
        if (!sourceKey) {
          const primaryIndexColumns =
            EntityMetadata.getPrimaryIndexColumns(source);
          sourceKey =
            primaryIndexColumns && primaryIndexColumns.length === 1
              ? primaryIndexColumns[0].name
              : 'id';
        }
        if (!targetKey && sourceKey) {
          // snake-case
          let s =
            source.name[0].toLowerCase() +
            source.name.substring(1) +
            '_' +
            sourceKey;
          if (!EntityMetadata.getColumnField(target, s)) s = camelCase(s);
          targetKey = s;
        }
      } else {
        if (!targetKey) {
          const primaryIndexColumns =
            EntityMetadata.getPrimaryIndexColumns(target);
          targetKey =
            primaryIndexColumns && primaryIndexColumns.length === 1
              ? primaryIndexColumns[0].name
              : 'id';
        }

        if (!sourceKey && targetKey) {
          // snake-case
          let s =
            target.name[0].toLowerCase() +
            target.name.substring(1) +
            '_' +
            targetKey;
          if (!EntityMetadata.getColumnField(source, s)) s = camelCase(s);
          sourceKey = s;
        }
      }
    }
    this._targetProperty = EntityMetadata.getColumnField(target, targetKey);
    if (!this._targetProperty)
      throw new Error(`Can't determine target key of ${this.name}`);
    this._sourceProperty = EntityMetadata.getColumnField(source, sourceKey);
    if (!this._sourceProperty)
      throw new Error(`Can't determine source key of ${this.name}`);
    this._targetKey = targetKey;
    this._sourceKey = sourceKey;
    this._resolved = true;
  }
}
