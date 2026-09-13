import { splitString } from 'fast-tokenizer';

const FIELD_PATTERN = /^([+-])?([a-z_$]\w*)$/i;
const NO_DOT_BRACKET_PATTERN = /[^.]\(/g;

/**
 * A parsed field-projection tree, as produced by
 * {@link parseFieldsProjection} from a `Repository.FindOptions.projection`
 * string/array. Keyed by (lower-cased, unless `keepCase`) field name at
 * each level, with nested projections (for dotted paths like
 * `'address.city'`) available via `Item.projection`.
 */
export class FieldsProjection {
  [key: string]: FieldsProjection.Item;
}

export namespace FieldsProjection {
  /** One field's inclusion/exclusion sign and, for a dotted path, its nested projection. */
  export class Item {
    /** `'-'` to exclude the field, `'+'` (or omitted) to include it. */
    sign?: string;
    /** The nested projection for a dotted sub-path (e.g. the `city` part of `'address.city'`). */
    projection?: FieldsProjection;
  }
}

/**
 * Parses a projection string/array (e.g. `['name', '-secret',
 * 'address.city']`, comma-separated fields also accepted within one string)
 * into a {@link FieldsProjection} tree, used by `FindCommand` to decide
 * which columns/embeds/associations to include in a query.
 *
 * @param projection - One projection string, or an array of them.
 * @param keepCase - When true, preserves field name casing instead of lower-casing it.
 * @returns The parsed projection tree, or `undefined` if `projection` is empty.
 * @throws {TypeError} If a field path segment doesn't match the expected identifier format.
 */
export function parseFieldsProjection(
  projection: string | string[],
  keepCase?: boolean,
): FieldsProjection | undefined {
  const arr = Array.isArray(projection) ? projection : [projection];
  if (!(arr && arr.length)) return;
  const out = new FieldsProjection();
  for (let s of arr) {
    if (!keepCase) s = s.toLowerCase();
    parse(s, out);
  }
  return out;
}

/** Parses one projection string (already split off a comma-separated list) into `target`, recursing into dotted sub-paths and comma-separated bracket groups. */
function parse(input: string, target: FieldsProjection) {
  /** Add dot before brackets which is required to split fields */
  input = input.replace(
    NO_DOT_BRACKET_PATTERN,
    s => s.charAt(0) + '.' + s.substring(1),
  );
  const fields = splitString(input, {
    delimiters: '.',
    brackets: true,
    keepBrackets: false,
  });
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (f.includes(',')) {
      const subFields = splitString(f, {
        delimiters: ',',
        brackets: true,
        keepBrackets: true,
      });
      for (const n of subFields) {
        parse(n, target);
      }
      continue;
    }
    const m = FIELD_PATTERN.exec(f);
    /* istanbul ignore next */
    if (!m) throw new TypeError(`Invalid field path (${input})`);

    const fieldName = m[2];
    const treeItem = (target[fieldName] =
      target[fieldName] || new FieldsProjection.Item());
    if (m[1]) treeItem.sign = m[1];

    if (i === fields.length - 1) {
      delete treeItem.projection;
    } else {
      target = treeItem.projection =
        treeItem.projection || new FieldsProjection();
    }
  }
}
