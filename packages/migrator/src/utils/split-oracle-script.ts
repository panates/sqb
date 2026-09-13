// A migration ".sql" script may contain several statements, but oracledb's
// execute() runs exactly one SQL/PL-SQL statement per call - unlike
// postgrejs, which happily runs a whole multi-statement script in one call.
// This follows the standard SQL*Plus script convention so existing Oracle
// scripts/DBAs' habits carry over unchanged: a PL/SQL block (a trigger,
// procedure, function, package body, or bare anonymous BEGIN/DECLARE block)
// is terminated by a lone "/" on its own line; everything else is plain
// DDL/DML, ";"-separated.
/** Matches the start of a line beginning a PL/SQL block: a bare `BEGIN`/`DECLARE`, or a `CREATE [OR REPLACE] TRIGGER`/`PROCEDURE`/`FUNCTION`/`PACKAGE [BODY]`. */
const PLSQL_START_PATTERN =
  /^\s*(BEGIN|DECLARE|CREATE\s+(OR\s+REPLACE\s+)?(TRIGGER|PROCEDURE|FUNCTION|PACKAGE(\s+BODY)?)\b)/i;
/** Matches a line that is only the `/` PL/SQL block terminator (whitespace-insensitive), the standard SQL*Plus script convention. */
const SOLO_SLASH_PATTERN = /^\s*\/\s*$/;

/**
 * Splits an Oracle migration script into individual statements, mirroring
 * the standard SQL*Plus script convention: a PL/SQL block (a trigger,
 * procedure, function, package body, or bare anonymous `BEGIN`/`DECLARE`
 * block) is terminated by a lone `/` on its own line and kept as a single
 * statement (its own trailing `;` is part of the block's syntax, not a
 * separator, so it's preserved); everything else is plain DDL/DML, split
 * further on top-level `;`s via {@link splitTopLevelSemicolons}. Used by
 * {@link OracleMigrationAdapter.executeTask} because `oracledb`'s
 * `execute()` runs exactly one SQL/PL-SQL statement per call, unlike most
 * other drivers this package supports.
 */
export function splitOracleScript(script: string): string[] {
  const lines = script.split(/\r?\n/);
  const statements: string[] = [];
  let buffer: string[] = [];
  let inPlSql = false;

  const flushPlain = () => {
    const text = buffer.join('\n');
    buffer = [];
    for (const stmt of splitTopLevelSemicolons(text)) {
      const trimmed = stmt.trim();
      if (trimmed) statements.push(trimmed);
    }
  };

  const flushPlSql = () => {
    // Unlike a plain statement, a PL/SQL block's trailing ";" (the one that
    // terminates its own closing END) is part of the block's own syntax,
    // not a statement separator - it must be kept, not stripped.
    const text = buffer.join('\n').trim();
    buffer = [];
    if (text) statements.push(text);
  };

  for (const line of lines) {
    if (!inPlSql && PLSQL_START_PATTERN.test(line)) {
      // A new PL/SQL block starts here - flush whatever plain statements
      // were buffered ahead of it first.
      flushPlain();
      inPlSql = true;
    }
    if (inPlSql && SOLO_SLASH_PATTERN.test(line)) {
      flushPlSql();
      inPlSql = false;
      continue; // the "/" line itself is a marker, not part of the block
    }
    buffer.push(line);
  }
  if (inPlSql) flushPlSql();
  else flushPlain();

  return statements;
}

/**
 * Splits on `;` while treating `'...'`/`"..."` spans (with `''`/`""` as an
 * escaped internal quote, standard Oracle SQL string/identifier syntax) as
 * opaque - a `;` inside a string literal must not be treated as a
 * statement separator. Does not special-case comments (`--` or `/* *\/`).
 */
function splitTopLevelSemicolons(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === quote) {
        if (text[i + 1] === quote) {
          current += text[++i];
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ';') {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) result.push(current);
  return result;
}
