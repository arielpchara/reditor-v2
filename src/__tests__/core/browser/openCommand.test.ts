import { buildOpenUrlCommand } from '../../../core/browser';

describe('buildOpenUrlCommand', () => {
  const url = 'https://localhost:8080';

  it('uses open on macOS', () => {
    expect(buildOpenUrlCommand(url, 'darwin')).toEqual({ command: 'open', args: [url] });
  });

  it('uses cmd start on Windows', () => {
    expect(buildOpenUrlCommand(url, 'win32')).toEqual({
      command: 'cmd',
      args: ['/c', 'start', '', url],
    });
  });

  it('uses xdg-open on Linux and other platforms', () => {
    expect(buildOpenUrlCommand(url, 'linux')).toEqual({ command: 'xdg-open', args: [url] });
    expect(buildOpenUrlCommand(url, 'freebsd')).toEqual({ command: 'xdg-open', args: [url] });
  });
});
