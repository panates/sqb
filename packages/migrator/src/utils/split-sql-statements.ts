/** Options for {@link splitSqlStatements}. */
export interface SplitSqlStatementsOptions {
  /** Treat `$tag$ ... $tag$` as a quoted body (PostgreSQL). */
  dollarQuotes?: boolean;
  /** Let `/* ... *\/` comments nest (PostgreSQL). */
  nestedComments?: boolean;
}

/**
 * Splits a SQL script into its `;`-separated statements in one linear
 * pass, for inspecting what a script would run - not for running it.
 * Comments are dropped, and the content of string literals, quoted
 * identifiers and (optionally) dollar-quoted bodies is blanked out, so
 * neither a `;` nor a keyword inside them is taken for a statement
 * boundary or a statement of its own. Each returned statement is trimmed,
 * with runs of whitespace collapsed; empty statements are left out.
 *
 * Written as a scanner rather than regular expressions on purpose: the
 * script comes from migration files, and the regular expressions this
 * needs (nested or repeated delimiters) backtrack polynomially on
 * adversarial input.
 */
export function splitSqlStatements(
  script: string,
  options: SplitSqlStatementsOptions = {},
): string[] {
  const statements: string[] = [];
  const n = script.length;
  let current = '';
  let i = 0;

  const flush = () => {
    const s = current.replace(/\s+/g, ' ').trim();
    if (s) statements.push(s);
    current = '';
  };

  while (i < n) {
    const c = script[i];
    const next = script[i + 1];

    /* -- line comment */
    if (c === '-' && next === '-') {
      const end = script.indexOf('\n', i + 2);
      i = end < 0 ? n : end;
      current += ' ';
      continue;
    }

    /* block comment, nested if asked to */
    if (c === '/' && next === '*') {
      let depth = 1;
      i += 2;
      while (i < n && depth) {
        if (script[i] === '*' && script[i + 1] === '/') {
          depth--;
          i += 2;
        } else if (
          options.nestedComments &&
          script[i] === '/' &&
          script[i + 1] === '*'
        ) {
          depth++;
          i += 2;
        } else i++;
      }
      current += ' ';
      continue;
    }

    /* 'string' or "identifier", a doubled quote escaping itself */
    if (c === "'" || c === '"') {
      i++;
      while (i < n) {
        if (script[i] === c) {
          if (script[i + 1] === c) i += 2;
          else break;
        } else i++;
      }
      i++;
      current += c + c;
      continue;
    }

    /* $tag$ body $tag$ */
    if (c === '$' && options.dollarQuotes) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(script[j])) j++;
      const tag = script.substring(i, j + 1);
      if (script[j] === '$' && (tag === '$$' || /^\$[A-Za-z_]/.test(tag))) {
        const end = script.indexOf(tag, j + 1);
        i = end < 0 ? n : end + tag.length;
        current += "''";
        continue;
      }
    }

    if (c === ';') {
      flush();
      i++;
      continue;
    }

    current += c;
    i++;
  }
  flush();
  return statements;
}
