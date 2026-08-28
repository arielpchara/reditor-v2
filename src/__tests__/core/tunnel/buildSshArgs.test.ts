import { buildSshArgs, DEFAULT_TUNNEL_REMOTE_HOST } from '../../../core/tunnel/buildSshArgs';
import { TunnelRequest } from '../../../core/tunnel/types';

const request = (overrides: Partial<TunnelRequest> = {}): TunnelRequest => ({
  target: 'user@box',
  localPort: 8080,
  remotePort: 3000,
  remoteHost: DEFAULT_TUNNEL_REMOTE_HOST,
  ...overrides,
});

describe('buildSshArgs', () => {
  it('opens a local forward with no remote command so the session outlives serve', () => {
    const args = buildSshArgs(request());
    expect(args[0]).toBe('-N');
    expect(args).toContain('-L');
    expect(args).toContain('8080:127.0.0.1:3000');
    expect(args[args.length - 1]).toBe('user@box');
  });

  it('fails the local bind if the port is already in use', () => {
    const args = buildSshArgs(request());
    const idx = args.indexOf('ExitOnForwardFailure=yes');
    expect(idx).toBeGreaterThan(0);
    expect(args[idx - 1]).toBe('-o');
  });

  it('keeps the SSH session alive', () => {
    const args = buildSshArgs(request());
    expect(args).toContain('ServerAliveInterval=30');
    expect(args).toContain('ServerAliveCountMax=3');
  });

  it('uses the requested local and remote ports', () => {
    const args = buildSshArgs(request({ localPort: 9090, remotePort: 4000 }));
    expect(args).toContain('9090:127.0.0.1:4000');
  });

  it('forwards to the given remote host on the server', () => {
    const args = buildSshArgs(request({ remoteHost: 'localhost' }));
    expect(args).toContain('8080:localhost:3000');
  });

  it('omits -p when sshPort is unset', () => {
    const args = buildSshArgs(request());
    expect(args).not.toContain('-p');
  });

  it('passes -p when sshPort is set', () => {
    const args = buildSshArgs(request({ sshPort: 2222 }));
    const idx = args.indexOf('-p');
    expect(idx).toBeGreaterThan(0);
    expect(args[idx + 1]).toBe('2222');
  });
});
