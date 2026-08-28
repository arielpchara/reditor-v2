import { parseCli, parseServeCommand } from '../../../adapters/cli/program';

const argv = (...args: string[]) => ['node', 'bin.js', 'serve', ...args];
const tunnelArgv = (...args: string[]) => ['node', 'bin.js', 'tunnel', ...args];

describe('parseServeCommand', () => {
  it('parses positional file argument', () => {
    const { file } = parseServeCommand(argv('myfile.ts'));
    expect(file).toBe('myfile.ts');
  });

  it('returns undefined file when no argument is given', () => {
    const { file } = parseServeCommand(argv());
    expect(file).toBeUndefined();
  });

  it('uses option defaults when no options are given', () => {
    const { opts } = parseServeCommand(argv('myfile.ts'));
    expect(opts.port).toBe('3000');
    expect(opts.host).toBe('localhost');
    expect(opts.forceDisableSecurity).toBe(false);
    expect(opts.tokenTtl).toBe('300');
    expect(opts.forceOtp).toBeUndefined();
  });

  it('parses --port', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '--port', '8080'));
    expect(opts.port).toBe('8080');
  });

  it('parses -p shorthand', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '-p', '9000'));
    expect(opts.port).toBe('9000');
  });

  it('parses --host', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '--host', '0.0.0.0'));
    expect(opts.host).toBe('0.0.0.0');
  });

  it('parses --force-disable-security as true', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '--force-disable-security'));
    expect(opts.forceDisableSecurity).toBe(true);
  });

  it('defaults forceDisableSecurity to false when flag is absent', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '--port', '4000'));
    expect(opts.forceDisableSecurity).toBe(false);
  });

  it('parses --token-ttl', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '--token-ttl', '600'));
    expect(opts.tokenTtl).toBe('600');
  });

  it('parses --force-otp', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '--force-otp', '111111'));
    expect(opts.forceOtp).toBe('111111');
  });

  it('defaults forceOtp to undefined when flag is absent', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '--port', '4000'));
    expect(opts.forceOtp).toBeUndefined();
  });

  it('parses --create as true', () => {
    const { opts } = parseServeCommand(argv('myfile.ts', '--create'));
    expect(opts.create).toBe(true);
  });

  it('defaults create to false when flag is absent', () => {
    const { opts } = parseServeCommand(argv('myfile.ts'));
    expect(opts.create).toBe(false);
  });
});

describe('parseCli', () => {
  it('selects tunnel when the first argument is tunnel', () => {
    const parsed = parseCli(tunnelArgv('user@box'));
    expect(parsed.command).toBe('tunnel');
    if (parsed.command !== 'tunnel') {
      return;
    }
    expect(parsed.target).toBe('user@box');
  });

  it('defaults tunnel local port to 8080 and remote port to 3000', () => {
    const parsed = parseCli(tunnelArgv('user@box'));
    if (parsed.command !== 'tunnel') {
      throw new Error('expected tunnel');
    }
    expect(parsed.opts.port).toBe('8080');
    expect(parsed.opts.remotePort).toBe('3000');
    expect(parsed.opts.sshPort).toBeUndefined();
  });

  it('parses --ssh-port', () => {
    const parsed = parseCli(tunnelArgv('user@box', '--ssh-port', '2222'));
    if (parsed.command !== 'tunnel') {
      throw new Error('expected tunnel');
    }
    expect(parsed.opts.sshPort).toBe('2222');
  });

  it('parses tunnel --port', () => {
    const parsed = parseCli(tunnelArgv('--port', '8080', 'user@box'));
    if (parsed.command !== 'tunnel') {
      throw new Error('expected tunnel');
    }
    expect(parsed.opts.port).toBe('8080');
    expect(parsed.target).toBe('user@box');
  });

  it('parses tunnel -p shorthand', () => {
    const parsed = parseCli(tunnelArgv('-p', '9090', 'prod'));
    if (parsed.command !== 'tunnel') {
      throw new Error('expected tunnel');
    }
    expect(parsed.opts.port).toBe('9090');
    expect(parsed.target).toBe('prod');
  });

  it('parses --remote-port', () => {
    const parsed = parseCli(tunnelArgv('user@box', '--remote-port', '4000'));
    if (parsed.command !== 'tunnel') {
      throw new Error('expected tunnel');
    }
    expect(parsed.opts.remotePort).toBe('4000');
  });

  it('allows a missing tunnel target so bin can print a usage error', () => {
    const parsed = parseCli(tunnelArgv('--port', '8080'));
    if (parsed.command !== 'tunnel') {
      throw new Error('expected tunnel');
    }
    expect(parsed.target).toBeUndefined();
  });

  it('does not treat a file named tunnel as the tunnel command', () => {
    const parsed = parseCli(argv('tunnel'));
    expect(parsed.command).toBe('serve');
    if (parsed.command !== 'serve') {
      return;
    }
    expect(parsed.file).toBe('tunnel');
  });

  it('keeps serve as the default command', () => {
    const parsed = parseCli(['node', 'bin.js', 'myfile.ts']);
    expect(parsed.command).toBe('serve');
    if (parsed.command !== 'serve') {
      return;
    }
    expect(parsed.file).toBe('myfile.ts');
  });
});
