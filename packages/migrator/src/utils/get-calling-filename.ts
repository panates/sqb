const PATH_PATTERN = /^(?:file:\/\/)?(.+)$/;

export function getCallingFilename(position = 0): string {
  position++;

  const oldStackTraceLimit = Error.stackTraceLimit;
  const oldPrepareStackTrace = Error.prepareStackTrace;
  // Force the limit deep enough for this call regardless of any ambient
  // Error.stackTraceLimit set elsewhere in the process - otherwise a small
  // ambient limit makes this silently return '' and callers fall back to
  // the wrong base directory.
  Error.stackTraceLimit = position + 1;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack;
  Error.stackTraceLimit = oldStackTraceLimit;
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
