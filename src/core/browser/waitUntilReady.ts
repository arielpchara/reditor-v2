import { DelayFn, ReadyCheck } from './types';

export const DEFAULT_BROWSER_POLL_MS = 300;

export const waitUntilReady = async (
  check: ReadyCheck,
  delay: DelayFn,
  intervalMs: number,
  isStopped: () => boolean,
): Promise<boolean> => {
  while (!isStopped()) {
    if (await check()) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};
