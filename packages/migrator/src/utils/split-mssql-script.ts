// A migration ".sql" script may contain several statements, and SQL Server
// happily runs a whole multi-statement batch in one call via Request#batch()
// - unlike oracledb, which runs exactly one statement per call. However,
// T-SQL requires CREATE TRIGGER/PROCEDURE/FUNCTION/VIEW (and CREATE SCHEMA)
// to be the *first* statement in their batch - confirmed live against a
// real server: `'CREATE TRIGGER' must be the first statement in a query
// batch`. This follows the standard sqlcmd/SSMS script convention so
// existing SQL Server scripts/DBAs' habits carry over unchanged: "GO" alone
// on its own line separates one batch from the next.
/** Matches a line that is only the `GO` batch separator (whitespace-insensitive), the standard sqlcmd/SSMS script convention. */
const SOLO_GO_PATTERN = /^\s*GO\s*$/i;

/**
 * Splits a T-SQL migration script into batches on lines containing only
 * `GO`, mirroring how sqlcmd/SSMS scripts are conventionally written. Used
 * by {@link MssqlMigrationAdapter.executeTask} because a `CREATE TRIGGER`/
 * `PROCEDURE`/`FUNCTION`/`VIEW` must be the first statement in its batch -
 * a script that also creates a table (or anything else) ahead of one needs
 * an explicit `GO` between them. Each returned batch still may itself
 * contain multiple `;`-separated statements, since `Request#batch()` (used
 * to execute each one) runs a whole batch per call.
 */
export function splitMssqlScript(script: string): string[] {
  const lines = script.split(/\r?\n/);
  const statements: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (text) statements.push(text);
  };

  for (const line of lines) {
    if (SOLO_GO_PATTERN.test(line)) {
      flush();
      continue; // the "GO" line itself is a marker, not part of the batch
    }
    buffer.push(line);
  }
  flush();

  return statements;
}
