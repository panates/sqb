import { splitString } from 'fast-tokenizer';

const FIELD_PATTERN = /^([+-])?([a-z_$]\w*)$/i;
const NO_DOT_BRACKET_PATTERN = /[^.]\(/g;

export class FieldsProjection {
  [key: string]: FieldsProjection.Item;
}

export namespace FieldsProjection {
  export class Item {
    sign?: string;
    projection?: FieldsProjection;
  }
}

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
