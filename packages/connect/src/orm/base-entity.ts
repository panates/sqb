import { Entity } from './decorators/entity.decorator.js';
import { REPOSITORY_KEY } from './orm.const.js';
import type { Repository } from './repository.class.js';

/**
 * Optional convenience base class for `@Entity`-decorated model classes,
 * adding an `instance.destroy()`/`instance.exists()` pair that delegate to
 * whichever `Repository` last loaded/attached to the instance. Extending it
 * is entirely optional - a plain `@Entity`-decorated class works just as
 * well with a `Repository` obtained separately via `client.getRepository(...)`.
 */
export class BaseEntity {
  private [REPOSITORY_KEY]?: Repository<any>;

  /**
   * @param partial - Initial column values to assign onto the instance (only known column fields are copied; everything else is ignored).
   */
  constructor(partial?: any) {
    const fields = Entity.getColumnFieldNames(
      Object.getPrototypeOf(this).constructor,
    );
    if (fields && partial) {
      for (const k of fields)
        if (partial[k] !== undefined) this[k] = partial[k];
    }
  }

  /** Deletes this record via the repository it was loaded through. Returns `false` if no repository is attached. */
  async destroy(): Promise<boolean> {
    const repo = this[REPOSITORY_KEY];
    return !!(repo && repo.delete(this));
  }

  /** Checks whether this record still exists, via the repository it was loaded through. Returns `false` if no repository is attached. */
  async exists(): Promise<boolean> {
    const repo = this[REPOSITORY_KEY];
    return !!(repo && repo.exists(this));
  }

  toJSON(): any {
    // this method is a placeholder and will be overwritten by declareEntity() method
    return this;
  }
}
