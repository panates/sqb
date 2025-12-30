import { camelCase } from 'putil-varhelpers';
import type { AssociationSettings, TypeThunk } from '../orm.type.js';
import { resolveEntityMeta } from '../util/orm.helper.js';
import type { ColumnFieldMetadata } from './column-field-metadata.js';
import type { EntityMetadata } from './entity-metadata.js';

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
  readonly many: boolean;

  constructor(name: string, args: AssociationSettings) {
    this.name = name;
    this.source = args.source;
    this.target = args.target;
    this.sourceKey = args.sourceKey;
    this.targetKey = args.targetKey;
    this.many = !!args.many;
  }

  async resolveSource(): Promise<EntityMetadata> {
    this._source = await resolveEntityMeta(this.source);
    if (!this._source)
      throw new Error(
        `Can't resolve source entity of association "${this.name}"`,
      );
    return this._source;
  }

  async resolveTarget(): Promise<EntityMetadata> {
    this._target = await resolveEntityMeta(this.target);
    if (!this._target)
      throw new Error(
        `Can't resolve target entity of association "${this.name}"`,
      );
    return this._target;
  }

  async resolveSourceKey(): Promise<string> {
    await this._resolveKeys();
    // @ts-ignore
    return this._sourceKey;
  }

  async resolveSourceProperty(): Promise<ColumnFieldMetadata> {
    await this._resolveKeys();
    // @ts-ignore
    return this._sourceProperty;
  }

  async resolveTargetKey(): Promise<string> {
    await this._resolveKeys();
    // @ts-ignore
    return this._targetKey;
  }

  async resolveTargetProperty(): Promise<ColumnFieldMetadata> {
    await this._resolveKeys();
    // @ts-ignore
    return this._targetProperty;
  }

  returnsMany(): boolean {
    return this.many;
  }

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
  }
}
