/**
 * Turns text a person typed into an FTS5 query that searches for its words
 * as they are, as PostgreSQL's `plainto_tsquery` does: each
 * whitespace-separated word becomes a quoted string, so FTS5's operators
 * and punctuation (`AND`, `NOT`, `-`, `^`, `:`, `*`, `"`) are searched for
 * rather than interpreted, and a row matches when it has every word.
 * Returns an empty string for blank text.
 *
 * @example
 * toFtsQuery('ORU^R01 refused') // '"ORU^R01" "refused"'
 */
export function toFtsQuery(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(word => '"' + word.replace(/"/g, '""') + '"')
    .join(' ');
}
