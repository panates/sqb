import type { NativeDatabase } from './types.js';

/** Detects a Bun runtime by the presence of the global `Bun` object and its `version` string. */
const isBun =
  typeof (globalThis as any).Bun !== 'undefined' &&
  typeof (globalThis as any).Bun.version === 'string';

/**
 * Opens `filename` with the driver matching the current JS runtime -
 * `bun:sqlite` under Bun, `node:sqlite` otherwise - dynamically importing
 * only the matching driver module, so the other runtime's native module
 * (unavailable outside its own runtime) is never loaded.
 */
export async function openDatabase(filename: string): Promise<NativeDatabase> {
  if (isBun) {
    const { bunDriver } = await import('./bun-driver.js');
    return bunDriver.open(filename);
  }
  const { nodeDriver } = await import('./node-driver.js');
  return nodeDriver.open(filename);
}
