import { SerializerExtension } from './types.js';

export class SerializerRegistry {
  protected static serializers: SerializerExtension[] = [];

  static get size(): number {
    return this.serializers.length;
  }

  static register(...extension: SerializerExtension[]): void {
    for (const ext of extension) {
      if (!ext.dialect)
        throw new TypeError(
          'A SerializerExtension must contain "dialect" property',
        );
      this.serializers.push(ext);
    }
  }

  static forEach(
    callback: (value: SerializerExtension, index: number) => void,
    thisArg?: any,
  ) {
    return this.serializers.forEach(callback, thisArg);
  }

  static items(): IterableIterator<SerializerExtension> {
    return this.serializers.values();
  }

  static unRegister(...extensions: SerializerExtension[]) {
    this.serializers = this.serializers.filter(x => !extensions.includes(x));
  }

  static getAll(dialect: string): SerializerExtension[] {
    return this.serializers.filter(x => x.dialect === dialect);
  }

  static get(index: number): SerializerExtension | undefined {
    return this.serializers[index];
  }

  static findDialect(dialect: string): SerializerExtension | undefined {
    return this.serializers.find(x => x.dialect === dialect);
  }

  static has(extension: SerializerExtension): boolean {
    return !!this.serializers.find(x => x === extension);
  }
}
