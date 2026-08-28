import { EventEmitter } from 'events';
import { SpawnOptions } from 'child_process';
import { createSshTunnelOpener, SpawnSsh } from '../../../adapters/tunnel/openTunnel';
import { DEFAULT_TUNNEL_REMOTE_HOST, DEFAULT_TUNNEL_RETRY_MS } from '../../../core/tunnel';
import { Logger } from '../../../core/logging';

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

const silentLogger = (): Logger => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('createSshTunnelOpener', () => {
  const request = {
    target: 'user@box',
    localPort: 8080,
    remotePort: 3000,
    remoteHost: DEFAULT_TUNNEL_REMOTE_HOST,
  };

  it('spawns ssh with local-forward args and inherited stdio', async () => {
    const child = new FakeChild();
    const spawnFn = jest.fn(asSpawn(child));
    const opener = createSshTunnelOpener({ logger: silentLogger(), spawnFn });
    const session = opener.open(request);
    void session.wait();
    await Promise.resolve();

    expect(spawnFn).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnFn.mock.calls[0];
    expect(command).toBe('ssh');
    expect(args[0]).toBe('-N');
    expect(args).toContain('8080:127.0.0.1:3000');
    expect(args[args.length - 1]).toBe('user@box');
    expect(options.stdio).toBe('inherit');
    session.close();
  });

  it('retries after a disconnect and logs the wait', async () => {
    const children = [new FakeChild(), new FakeChild()];
    let spawnCount = 0;
    const spawnFn = jest.fn((() => {
      const next = children[spawnCount] ?? new FakeChild();
      spawnCount += 1;
      return next;
    }) as unknown as SpawnSsh);
    const logger = silentLogger();
    let releaseDelay: () => void = () => undefined;
    const delayFn = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseDelay = resolve;
        }),
    );
    const opener = createSshTunnelOpener({ logger, spawnFn, delayFn });
    const session = opener.open(request);
    const waitPromise = session.wait();

    await Promise.resolve();
    expect(spawnFn).toHaveBeenCalledTimes(1);

    children[0].emit('close', 255);
    await Promise.resolve();
    await Promise.resolve();

    expect(logger.warn).toHaveBeenCalledWith('SSH tunnel disconnected', {
      attempt: 1,
      code: 255,
    });
    expect(logger.info).toHaveBeenCalledWith('Retrying SSH tunnel', {
      nextAttempt: 2,
      delayMs: DEFAULT_TUNNEL_RETRY_MS,
    });
    expect(delayFn).toHaveBeenCalledWith(DEFAULT_TUNNEL_RETRY_MS);

    releaseDelay();
    await Promise.resolve();
    await Promise.resolve();

    expect(spawnFn).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith('Connecting SSH tunnel', {
      attempt: 2,
      target: 'user@box',
    });

    session.close();
    await expect(waitPromise).resolves.toBe(0);
  });

  it('does not retry when ssh is missing', async () => {
    const child = new FakeChild();
    const spawnFn = jest.fn(asSpawn(child));
    const delayFn = jest.fn(() => Promise.resolve());
    const logger = silentLogger();
    const opener = createSshTunnelOpener({ logger, spawnFn, delayFn });
    const session = opener.open(request);
    const waitPromise = session.wait();

    await Promise.resolve();
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    child.emit('error', err);
    await expect(waitPromise).resolves.toBe(1);
    expect(logger.error).toHaveBeenCalledWith('ssh executable not found on PATH');
    expect(delayFn).not.toHaveBeenCalled();
  });

  it('kills the ssh process on close', async () => {
    const child = new FakeChild();
    const opener = createSshTunnelOpener({ logger: silentLogger(), spawnFn: asSpawn(child) });
    const session = opener.open(request);
    void session.wait();
    await Promise.resolve();

    session.close();
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });
});
