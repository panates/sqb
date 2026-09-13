import type { SerializerExtension } from './types.js';

/**
 * Process-wide registry of {@link SerializerExtension}s (dialect plugins).
 * `@sqb/*-dialect` packages call {@link SerializerRegistry.register} as a
 * side effect of being imported, so simply importing a dialect package (e.g.
 * `@sqb/postgres-dialect`) is enough to make `generate({ dialect: 'postgres' })`
 * pick up its overrides - {@link SerializeContext} consults this registry
 * for every fragment it serializes.
 */
export class SerializerRegistry {
  protected static serializers: SerializerExtension[] = [];

  /** Number of currently registered extensions, across all dialects. */
  static get size(): number {
    return this.serializers.length;
  }

  /**
   * Registers one or more dialect extensions.
   *
   * @throws {TypeError} If an extension is missing its required `dialect` property.
   */
  static register(...extension: SerializerExtension[]): void {
    for (const ext of extension) {
      if (!ext.dialect)
        throw new TypeError(
          'A SerializerExtension must contain "dialect" property',
        );
      this.serializers.push(ext);
    }
  }

  /**
   * Iterates all registered extensions, in registration order.
   */
  static forEach(
    callback: (value: SerializerExtension, index: number) => void,
    thisArg?: any,
  ) {
    return this.serializers.forEach(callback, thisArg);
  }

  /**
   * Returns an iterator over all registered extensions, across every
   * dialect - this is what {@link SerializeContext} walks for each fragment.
   */
  static items(): IterableIterator<SerializerExtension> {
    return this.serializers.values();
  }

  /**
   * Removes one or more previously registered extensions (matched by
   * reference). No-op for an extension that isn't currently registered.
   */
  static unRegister(...extensions: SerializerExtension[]) {
    this.serializers = this.serializers.filter(x => !extensions.includes(x));
  }

  /**
   * Returns every extension registered for the given dialect name.
   */
  static getAll(dialect: string): SerializerExtension[] {
    return this.serializers.filter(x => x.dialect === dialect);
  }

  /**
   * Returns the extension registered at the given index (registration
   * order), or `undefined` if out of range.
   */
  static get(index: number): SerializerExtension | undefined {
    return this.serializers[index];
  }

  /**
   * Returns the first registered extension for the given dialect name, or
   * `undefined` if none is registered.
   */
  static findDialect(dialect: string): SerializerExtension | undefined {
    return this.serializers.find(x => x.dialect === dialect);
  }

  /**
   * Checks whether the given extension instance is currently registered.
   */
  static has(extension: SerializerExtension): boolean {
    return !!this.serializers.find(x => x === extension);
  }
}
