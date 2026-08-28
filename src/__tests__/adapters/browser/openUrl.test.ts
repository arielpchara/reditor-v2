import { EventEmitter } from 'events';
import { SpawnOptions } from 'child_process';
import { createBrowserOpener, SpawnBrowser } from '../../../adapters/browser/openUrl';
import { Logger } from '../../../core/logging';

class FakeChild extends EventEmitter {
  unref = jest.fn();
}

const silentLogger = (): Logger => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('createBrowserOpener', () => {
  const url = 'https://localhost:8080';

  it('spawns open on macOS and detaches the child', () => {
    const child = new FakeChild();
    const spawnFn = jest.fn(
      ((_command: string, _args: readonly string[], _options: SpawnOptions) =>
        child) as unknown as SpawnBrowser,
    );
    const logger = silentLogger();
    const opener = createBrowserOpener({ logger, spawnFn, platform: 'darwin' });
    expect(opener.open(url)).toEqual({ ok: true });
    expect(spawnFn).toHaveBeenCalledWith('open', [url], { stdio: 'ignore', detached: true });
    expect(child.unref).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Opened editor in browser', { url });
  });

  it('returns ok false when spawn throws', () => {
    const spawnFn = jest.fn(() => {
      throw new Error('no opener');
    }) as unknown as SpawnBrowser;
    const logger = silentLogger();
    const opener = createBrowserOpener({ logger, spawnFn, platform: 'linux' });
    expect(opener.open(url)).toEqual({ ok: false, error: 'no opener' });
    expect(logger.warn).toHaveBeenCalledWith('Failed to open browser', {
      url,
      error: 'no opener',
    });
  });

  it('logs when the spawned process errors', () => {
    const child = new FakeChild();
    const spawnFn = jest.fn(
      ((_command: string, _args: readonly string[], _options: SpawnOptions) =>
        child) as unknown as SpawnBrowser,
    );
    const logger = silentLogger();
    const opener = createBrowserOpener({ logger, spawnFn, platform: 'linux' });
    opener.open(url);
    child.emit('error', new Error('xdg-open missing'));
    expect(logger.warn).toHaveBeenCalledWith('Failed to open browser', {
      url,
      error: 'xdg-open missing',
    });
  });
});
