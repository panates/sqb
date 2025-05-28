import type {
  Migration,
  MigrationPackage,
  MigrationTask,
} from './migration-package.js';
import type { MigrationStatus } from './types.js';

export abstract class MigrationAdapter {
  abstract readonly packageName: string;
  abstract readonly status: MigrationStatus;
  abstract readonly version: number;

  abstract close(): Promise<void>;

  abstract refresh(): Promise<void>;

  abstract update(info: {
    status?: MigrationStatus;
    version?: number;
  }): Promise<void>;

  abstract writeEvent(event: MigrationAdapter.Event): Promise<void>;

  abstract executeTask(
    migrationPackage: MigrationPackage,
    migration: Migration,
    task: MigrationTask,
    variables: Record<string, any>,
  ): Promise<void>;

  abstract lockSchema(): Promise<void>;

  abstract unlockSchema(): Promise<void>;

  abstract backupDatabase(): Promise<void>;

  abstract restoreDatabase(): Promise<void>;

  protected replaceVariables(
    text: string,
    variables: Record<string, string>,
  ): string {
    return text.replace(
      /(\$\((\w+)\))/g,
      (s, ...args: string[]) => variables[args[1]] || s,
    );
  }
}

export namespace MigrationAdapter {
  export enum EventKind {
    started = 'started',
    success = 'success',
    error = 'error',
  }

  export interface Event {
    event: EventKind;
    version: number;
    message: string;
    title?: string;
    filename?: string;
    details?: string;
  }
}
