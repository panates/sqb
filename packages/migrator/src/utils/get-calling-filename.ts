const PATH_PATTERN = /^(?:file:\/\/)?(.+)$/;

export function getCallingFilename(position = 0): string {
  position++;
  if (position >= Error.stackTraceLimit) return '';

  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack;
  Error.prepareStackTrace = oldPrepareStackTrace;

  if (stack !== null && typeof stack === 'object') {
    // stack[0] holds this file
    // stack[1] holds where this function was called
    const s = stack[position]
      ? (stack[position] as any).getFileName()
      : undefined;
    const m = s ? PATH_PATTERN.exec(s) : undefined;
    return m ? m[1] : '';
  }
  return '';
}
