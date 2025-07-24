export interface MigrationInfo {
  packageName: string;
  status: MigrationStatus;
  version: number;
}

export enum MigrationStatus {
  idle = 'idle',
  busy = 'busy',
}
