/**
 * Prints array with line feeding
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
