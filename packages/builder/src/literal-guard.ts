/**
 * Keeps the content of string literals out of the layout pass.
 *
 * The default serializers lay out the generated SQL with control
 * characters - `\n` (line break), `\t` (indent), `\b` (dedent), `\r` - that
 * `Query.generate()` turns into whitespace via `flattenText`, and some
 * serializers inspect fragments for a `\n` to decide whether to break them
 * over several lines. A string literal holding those characters would be
 * taken for layout: its line breaks collapsed to spaces, or indentation
 * inserted after them. So a literal's control characters are swapped for
 * private-use placeholders when the literal is produced
 * ({@link protectLiteral}), and swapped back once the layout pass is done
 * ({@link restoreLiterals}).
 */
const PLACEHOLDERS: [string, string][] = [
  ['\n', ''],
  ['\t', ''],
  ['\b', ''],
  ['\r', ''],
];

/** Replaces the layout control characters in a serialized string literal with placeholders. */
export function protectLiteral(literal: string): string {
  for (const [chr, placeholder] of PLACEHOLDERS)
    literal = literal.replaceAll(chr, placeholder);
  return literal;
}

/** Puts the control characters back in place of the placeholders, over a whole generated SQL text. */
export function restoreLiterals(sql: string): string {
  for (const [chr, placeholder] of PLACEHOLDERS)
    sql = sql.replaceAll(placeholder, chr);
  return sql;
}
