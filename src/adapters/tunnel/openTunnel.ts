import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { buildSshArgs, TunnelOpener, TunnelRequest, TunnelSession } from '../../core/tunnel';

export type SpawnSsh = (
  command: string,
  args: readonly string[],
  options: SpawnOptions,
) => ChildProcess;

export const openSshTunnel = (request: TunnelRequest, spawnFn: SpawnSsh = spawn): TunnelSession => {
  const child = spawnFn('ssh', buildSshArgs(request), { stdio: 'inherit' });
  let settled = false;

  const wait = (): Promise<number> =>
    new Promise((resolve, reject) => {
      child.once('error', (err: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(err);
      });
      child.once('close', (code: number | null) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(code ?? 1);
      });
    });

  const close = (): void => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };

  return { wait, close };
};

export const createSshTunnelOpener = (spawnFn: SpawnSsh = spawn): TunnelOpener => ({
  open: (request: TunnelRequest): TunnelSession => openSshTunnel(request, spawnFn),
});
