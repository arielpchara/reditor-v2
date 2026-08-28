import { EventEmitter } from 'events';
import { SpawnOptions } from 'child_process';
import { createSshTunnelOpener, SpawnSsh } from '../../../adapters/tunnel/openTunnel';
import { DEFAULT_TUNNEL_REMOTE_HOST } from '../../../core/tunnel';

class FakeChild extends EventEmitter {
  killed = false;

  kill = jest.fn((_signal?: string): boolean => {
    this.killed = true;
    this.emit('close', 0);
    return true;
  });
}

const asSpawn = (child: FakeChild): SpawnSsh =>
  ((_command: string, _args: readonly string[], _options: SpawnOptions) =>
    child) as unknown as SpawnSsh;

describe('createSshTunnelOpener', () => {
  const request = {
    target: 'user@box',
    localPort: 8080,
    remotePort: 3000,
    remoteHost: DEFAULT_TUNNEL_REMOTE_HOST,
  };

  it('spawns ssh with local-forward args and inherited stdio', () => {
    const child = new FakeChild();
    const spawnFn = jest.fn(asSpawn(child));
    const opener = createSshTunnelOpener(spawnFn);

    opener.open(request);

    expect(spawnFn).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnFn.mock.calls[0];
    expect(command).toBe('ssh');
    expect(args[0]).toBe('-N');
    expect(args).toContain('8080:127.0.0.1:3000');
    expect(args[args.length - 1]).toBe('user@box');
    expect(options.stdio).toBe('inherit');
  });

  it('resolves wait() with the process exit code', async () => {
    const child = new FakeChild();
    const opener = createSshTunnelOpener(asSpawn(child));
    const session = opener.open(request);

    const waitPromise = session.wait();
    child.emit('close', 0);
    await expect(waitPromise).resolves.toBe(0);
  });

  it('treats a null close code as failure', async () => {
    const child = new FakeChild();
    const opener = createSshTunnelOpener(asSpawn(child));
    const session = opener.open(request);

    const waitPromise = session.wait();
    child.emit('close', null);
    await expect(waitPromise).resolves.toBe(1);
  });

  it('rejects wait() when ssh cannot be spawned', async () => {
    const child = new FakeChild();
    const opener = createSshTunnelOpener(asSpawn(child));
    const session = opener.open(request);

    const waitPromise = session.wait();
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    child.emit('error', err);
    await expect(waitPromise).rejects.toBe(err);
  });

  it('kills the ssh process on close', () => {
    const child = new FakeChild();
    const opener = createSshTunnelOpener(asSpawn(child));
    const session = opener.open(request);

    session.close();
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });
});
