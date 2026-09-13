/** Describes one index (or the primary key, when `primary` is set) on an entity, as declared via `@Index`/`@PrimaryKey`. */
export interface IndexMetadata {
  /**
   *  Columns of the index
   */
  columns: string[];

  /**
   *  Name of the index
   */
  name?: string;

  /**
   * Specifies if index is unique
   */
  unique?: boolean;

  /**
   * Specifies if index is primary
   */
  primary?: boolean;
}
