import type { NativeDatabase } from './types.js';

const isBun =
  typeof (globalThis as any).Bun !== 'undefined' &&
  typeof (globalThis as any).Bun.version === 'string';

export async function openDatabase(filename: string): Promise<NativeDatabase> {
  if (isBun) {
    const { bunDriver } = await import('./bun-driver.js');
    return bunDriver.open(filename);
  }
  const { nodeDriver } = await import('./node-driver.js');
  return nodeDriver.open(filename);
}
