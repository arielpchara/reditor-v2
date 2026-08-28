import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { Logger } from '../../core/logging';
import {
  buildSshArgs,
  DEFAULT_TUNNEL_RETRY_MS,
  TunnelOpener,
  TunnelRequest,
  TunnelSession,
} from '../../core/tunnel';

export type SpawnSsh = (
  command: string,
  args: readonly string[],
  options: SpawnOptions,
) => ChildProcess;

export type DelayFn = (ms: number) => Promise<void>;

export type TunnelOpenerDeps = {
  logger: Logger;
  spawnFn?: SpawnSsh;
  delayFn?: DelayFn;
  retryMs?: number;
};

const defaultDelay: DelayFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const openSshTunnel = (request: TunnelRequest, deps: TunnelOpenerDeps): TunnelSession => {
  const spawnFn = deps.spawnFn ?? spawn;
  const delayFn = deps.delayFn ?? defaultDelay;
  const retryMs = deps.retryMs ?? DEFAULT_TUNNEL_RETRY_MS;
  const { logger } = deps;

  let child: ChildProcess | undefined;
  let stopped = false;
  let attempt = 0;
  let exitCode = 0;
  let interruptDelay: (() => void) | undefined;

  const close = (): void => {
    stopped = true;
    interruptDelay?.();
    interruptDelay = undefined;
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  };

  const runOnce = (): Promise<'retry' | 'stop'> =>
    new Promise((resolve) => {
      let settled = false;
      const finish = (next: 'retry' | 'stop'): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(next);
      };

      attempt += 1;
      logger.info('Connecting SSH tunnel', { attempt, target: request.target });

      try {
        child = spawnFn('ssh', buildSshArgs(request), { stdio: 'inherit' });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.warn('SSH tunnel failed to start', { attempt, error: error.message });
        finish(stopped ? 'stop' : 'retry');
        return;
      }

      child.once('error', (err: Error) => {
        if (stopped) {
          finish('stop');
          return;
        }
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          logger.error('ssh executable not found on PATH');
          stopped = true;
          exitCode = 1;
          finish('stop');
          return;
        }
        logger.warn('SSH tunnel connection failed', { attempt, error: err.message });
        finish('retry');
      });

      child.once('close', (code: number | null) => {
        if (stopped) {
          finish('stop');
          return;
        }
        logger.warn('SSH tunnel disconnected', { attempt, code: code ?? 1 });
        finish('retry');
      });
    });

  const wait = async (): Promise<number> => {
    while (!stopped) {
      const result = await runOnce();
      if (result === 'stop' || stopped) {
        break;
      }
      logger.info('Retrying SSH tunnel', { nextAttempt: attempt + 1, delayMs: retryMs });
      await Promise.race([
        delayFn(retryMs),
        new Promise<void>((resolve) => {
          interruptDelay = resolve;
        }),
      ]);
      interruptDelay = undefined;
    }
    return exitCode;
  };

  return { wait, close };
};

export const createSshTunnelOpener = (deps: TunnelOpenerDeps): TunnelOpener => ({
  open: (request: TunnelRequest): TunnelSession => openSshTunnel(request, deps),
});
