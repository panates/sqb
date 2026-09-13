/**
 * The `sql.*` namespace: every query builder, column/expression element, and
 * operator. Re-exported as a whole from the package root, both flattened
 * (`import { Select } from '@sqb/builder'`) and namespaced
 * (`import { sql } from '@sqb/builder'; sql.Select(...)`).
 */
export * from './delete.js';
export * from './elements/index.js';
export * from './insert.js';
export * from './operators/index.js';
export * from './query.js';
export * from './returning-query.js';
export * from './select.js';
export * from './union.js';
export * from './update.js';
