import { parseServeCommand } from '../../../adapters/cli/program';

const argv = (...args: string[]) => ['node', 'bin.js', 'serve', ...args];

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
