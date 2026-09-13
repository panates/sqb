import type { Adapter } from './adapter.js';

/**
 * Process-wide registry of {@link Adapter}s. Each `@sqb/*` driver package
 * calls {@link AdapterRegistry.register} as a side effect of being imported,
 * so simply importing a driver package (e.g. `import '@sqb/postgres'`) is
 * enough to make `new SqbClient({ dialect: 'postgres', ... })` find it -
 * `SqbClient`'s constructor looks adapters up here by `driver` or `dialect`.
 */
export class AdapterRegistry {
  protected static adapters: Adapter[] = [];

  /** Number of currently registered adapters, across all drivers/dialects. */
  static get size(): number {
    return this.adapters.length;
  }

  /**
   * Registers one or more adapters.
   *
   * @throws {TypeError} If an adapter is missing its required `driver` property.
   */
  static register(...adapters: Adapter[]): void {
    for (const adapter of adapters) {
      if (!adapter.driver)
        throw new TypeError('A DatabaseAdapter must contain "driver" property');
      this.adapters.push(adapter);
    }
  }

  /** Iterates all registered adapters, in registration order. */
  static forEach(
    callback: (value: Adapter, index: number) => void,
    thisArg?: any,
  ) {
    return this.adapters.forEach(callback, thisArg);
  }

  /** Returns an iterator over all registered adapters, across every driver/dialect. */
  static items(): IterableIterator<Adapter> {
    return this.adapters.values();
  }

  /**
   * Removes one or more previously registered adapters (matched by
   * reference). No-op for an adapter that isn't currently registered.
   */
  static unRegister(...extensions: Adapter[]) {
    this.adapters = this.adapters.filter(x => !extensions.includes(x));
  }

  /** Returns every adapter registered for the given dialect name. */
  static getAll(dialect: string): Adapter[] {
    return this.adapters.filter(x => x.dialect === dialect);
  }

  /** Returns the adapter registered at the given index (registration order), or `undefined` if out of range. */
  static get(index: number): Adapter | undefined {
    return this.adapters[index];
  }

  /** Returns the first registered adapter for the given dialect name, or `undefined` if none is registered. */
  static findDialect(dialect: string): Adapter | undefined {
    return this.adapters.find(x => x.dialect === dialect);
  }

  /** Returns the first registered adapter for the given driver name, or `undefined` if none is registered. */
  static findDriver(dialect: string): Adapter | undefined {
    return this.adapters.find(x => x.driver === dialect);
  }

  /** Checks whether the given adapter instance is currently registered. */
  static has(extension: Adapter): boolean {
    return !!this.adapters.find(x => x === extension);
  }
}
