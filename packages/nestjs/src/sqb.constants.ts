/** Injection token for the raw {@link SqbModuleOptions}/`SqbModuleAsyncOptions` object `SqbModule.forRoot()`/`forRootAsync()` was called with. */
export const SQB_MODULE_OPTIONS = Symbol('SQB_MODULE_OPTIONS');

/** Injection token for the resolved {@link SqbClientConnectionOptions} (env-defaults applied by `getSqbConfig`), used to construct the `SqbClient` provider. */
export const SQB_CONNECTION_OPTIONS = Symbol('SQB_CONNECTION_OPTIONS');

/** Injection token for a random id unique to each `SqbCoreModule.forRoot()`/`forRootAsync()` call, letting multiple registrations of the module coexist. */
export const SQB_MODULE_ID = Symbol('SQB_MODULE_ID');
