/**
 * Copies `baseCtor`'s own prototype methods/accessors onto `derivedCtor`'s
 * prototype (skipping `constructor`/`__proto__`/`toJSON`/`toString`, and
 * anything `filter` rejects) - the runtime half of `Entity.mixin`/`Entity.Pick`/
 * `Entity.Omit`/`Entity.Union`, which pair this with `EntityMetadata.mixin`
 * to also merge entity metadata.
 */
export function applyMixins(
  derivedCtor: any,
  baseCtor: any,
  filter?: (k: string) => boolean,
) {
  for (const name of Object.getOwnPropertyNames(baseCtor.prototype)) {
    if (
      name === 'constructor' ||
      name === '__proto__' ||
      name === 'toJSON' ||
      name === 'toString' ||
      (filter && !filter(name))
    ) {
      continue;
    }
    Object.defineProperty(
      derivedCtor.prototype,
      name,
      Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
        Object.create(null),
    );
  }
}
