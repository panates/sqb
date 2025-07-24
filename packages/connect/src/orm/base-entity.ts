import { Entity } from './decorators/entity.decorator.js';
import { REPOSITORY_KEY } from './orm.const.js';
import type { Repository } from './repository.class.js';

export class BaseEntity {
  private [REPOSITORY_KEY]?: Repository<any>;

  constructor(partial?: any) {
    const fields = Entity.getColumnFieldNames(
      Object.getPrototypeOf(this).constructor,
    );
    if (fields && partial) {
      for (const k of fields)
        if (partial[k] !== undefined) this[k] = partial[k];
    }
  }

  async destroy(): Promise<boolean> {
    const repo = this[REPOSITORY_KEY];
    return !!(repo && repo.destroy(this));
  }

  async exists(): Promise<boolean> {
    const repo = this[REPOSITORY_KEY];
    return !!(repo && repo.exists(this));
  }

  toJSON(): any {
    // this method is a placeholder and will be overwritten by declareEntity() method
    return this;
  }
}
