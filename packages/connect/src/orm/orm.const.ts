/** `Reflect` metadata key under which an `@Entity`-decorated class's {@link EntityMetadata} is stored. */
export const ENTITY_METADATA_KEY = Symbol.for('SQB_ENTITY_METADATA');
/** Property key under which a `BaseEntity` instance stashes the {@link Repository} it was loaded through, so instance methods like `destroy()`/`exists()` can use it. */
export const REPOSITORY_KEY = Symbol.for('SQB_REPOSITORY');
/** Property key some decorators (e.g. `@Column`) use to attach their underlying implementation function, letting the exported decorator stay overload-friendly while sharing one implementation. */
export const DECORATOR_FACTORY = Symbol.for('decorator.factory');
