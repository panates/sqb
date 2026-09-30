/** A migration package's current bookkeeping state as tracked in the target database's summary table. */
export interface MigrationInfo {
  packageName: string;
  status: MigrationStatus;
  version: number;
}

/**
 * Tracks whether a migration package's last run completed cleanly
 * (`idle`) or was interrupted mid-task (`busy`, left behind if the process
 * died partway through {@link DbMigrator.execute}) - surfaced so a
 * follow-up run (or an operator) can tell an unfinished migration apart
 * from a healthy, up-to-date one.
 */
export enum MigrationStatus {
  idle = 'idle',
  busy = 'busy',
}
