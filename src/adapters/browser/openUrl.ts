import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { Logger } from '../../core/logging';
import { BrowserOpener, OpenUrlResult, buildOpenUrlCommand } from '../../core/browser';

export type SpawnBrowser = (
  command: string,
  args: readonly string[],
  options: SpawnOptions,
) => ChildProcess;

export type BrowserOpenerDeps = {
  logger: Logger;
  spawnFn?: SpawnBrowser;
  platform?: string;
};

export const createBrowserOpener = (deps: BrowserOpenerDeps): BrowserOpener => ({
  open: (url: string): OpenUrlResult => {
    const platform = deps.platform ?? process.platform;
    const { command, args } = buildOpenUrlCommand(url, platform);
    const spawnFn = deps.spawnFn ?? spawn;
    try {
      const child = spawnFn(command, args, { stdio: 'ignore', detached: true });
      child.once('error', (err: Error) => {
        deps.logger.warn('Failed to open browser', { url, error: err.message });
      });
      child.unref();
      deps.logger.info('Opened editor in browser', { url });
      return { ok: true };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      deps.logger.warn('Failed to open browser', { url, error: error.message });
      return { ok: false, error: error.message };
    }
  },
});
