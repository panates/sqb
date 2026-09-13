/**
 * Joins an array of already-serialized SQL fragments into one string,
 * wrapping onto a new line whenever the current line would otherwise exceed
 * `lfLen` characters. Used by the default serializers (column lists, `IN`
 * lists, `GROUP BY`/`ORDER BY` lists, etc.) to keep generated SQL readable
 * without producing one giant unbroken line.
 *
 * @param arr - The fragments to join; `undefined` entries are skipped.
 * @param sep - Separator placed between fragments (default: `,`).
 * @param lfLen - Approximate line-length threshold that triggers a line break (default: `60`).
 * @returns The joined text, or an empty string if `arr` has no printable entries.
 */
export function printArray(
  arr: string[],
  sep?: string,
  lfLen?: number,
): string {
  let out = '';
  let line = '';
  let k = 0;
  lfLen = lfLen || 60;
  sep = sep || ',';
  for (const s of arr) {
    /* istanbul ignore next */
    if (s === undefined) continue;
    line += k > 0 ? sep : '';
    if (line.length > lfLen) {
      out += (out ? '\n' : '') + line;
      line = '';
    } else line += line ? ' ' : '';
    line += s;
    k++;
  }
  if (line) out += (out ? '\n' : '') + line;
  return out;
}
