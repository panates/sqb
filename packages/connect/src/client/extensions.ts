import { SerializerExtension } from '@sqb/builder';
import { Adapter } from './adapter.js';

export class AdapterRegistry {
  protected static adapters: Adapter[] = [];

  static get size(): number {
    return this.adapters.length;
  }

  static register(...adapters: Adapter[]): void {
    for (const adapter of adapters) {
      if (!adapter.driver)
        throw new TypeError('A DatabaseAdapter must contain "driver" property');
      this.adapters.push(adapter);
    }
  }

  static forEach(
    callback: (value: Adapter, index: number) => void,
    thisArg?: any,
  ) {
    return this.adapters.forEach(callback, thisArg);
  }

  static items(): IterableIterator<Adapter> {
    return this.adapters.values();
  }

  static unRegister(...extensions: Adapter[]) {
    this.adapters = extensions.filter(x => !extensions.includes(x));
  }

  static getAll(dialect: string): Adapter[] {
    return this.adapters.filter(x => x.dialect === dialect);
  }

  static get(index: number): SerializerExtension | undefined {
    return this.adapters[index];
  }

  static findDialect(dialect: string): SerializerExtension | undefined {
    return this.adapters.find(x => x.dialect === dialect);
  }

  static findDriver(dialect: string): SerializerExtension | undefined {
    return this.adapters.find(x => x.driver === dialect);
  }

  static has(extension: Adapter): boolean {
    return !!this.adapters.find(x => x === extension);
  }
}
