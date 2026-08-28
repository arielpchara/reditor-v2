import { Command } from 'commander';

export type ServeOptions = {
  port: string;
  host: string;
  forceDisableSecurity: boolean;
  tokenTtl: string;
  forceOtp: string | undefined;
  create: boolean;
};

export type TunnelOptions = {
  port: string;
  remotePort: string;
  sshPort: string | undefined;
  identity: string | undefined;
};

export type ParsedServeCommand = {
  command: 'serve';
  opts: ServeOptions;
  file: string | undefined;
};

export type ParsedTunnelCommand = {
  command: 'tunnel';
  opts: TunnelOptions;
  target: string | undefined;
};

export type ParsedCli = ParsedServeCommand | ParsedTunnelCommand;

const SERVE_DEFAULTS: ServeOptions = {
  port: '3000',
  host: 'localhost',
  forceDisableSecurity: false,
  tokenTtl: '300',
  forceOtp: undefined,
  create: false,
};

const TUNNEL_DEFAULTS: TunnelOptions = {
  port: '8080',
  remotePort: '3000',
  sshPort: undefined,
  identity: undefined,
};

export const buildProgram = (): Command => {
  const program = new Command();

  program.name('reditor').description('Edit files from your server in the browser.');

  program
    .command('serve', { isDefault: true })
    .description('Start the web server')
    .argument('[file]', 'Path to the file to edit in the browser')
    .option('-p, --port <port>', 'Port to listen on', '3000')
    .option('-H, --host <host>', 'Host to bind to', 'localhost')
    .option(
      '--force-disable-security',
      '[DANGER] Disable OTP and JWT auth — anyone on the network can access the file',
      false,
    )
    .option('--token-ttl <seconds>', 'JWT token time-to-live in seconds', '300')
    .option('--force-otp <otp>', '[TEST ONLY] Override the generated OTP with a fixed value')
    .option('--create', 'Create the file if it does not exist (skips confirmation prompt)', false)
    .action(() => {
      // action is handled in bin.ts to keep this file pure/testable
    });

  program
    .command('tunnel')
    .description('Open an SSH tunnel from this machine to a remote reditor serve')
    .argument('[target]', 'SSH target (user@host or an SSH config Host)')
    .option('-p, --port <port>', 'Local port to listen on', '8080')
    .option('--remote-port <port>', 'Remote reditor serve port', '3000')
    .option('--ssh-port <port>', 'SSH port on the target host')
    .option('-i, --identity <file>', 'SSH private key')
    .action(() => {
      // action is handled in bin.ts to keep this file pure/testable
    });

  return program;
};

export const parseCli = (argv: string[]): ParsedCli => {
  const program = buildProgram();
  program.parse(argv);

  const invokedTunnel = argv.slice(2)[0] === 'tunnel';
  if (invokedTunnel) {
    const cmd = program.commands.find((c) => c.name() === 'tunnel');
    const opts = cmd?.opts<TunnelOptions>() ?? TUNNEL_DEFAULTS;
    return { command: 'tunnel', opts, target: cmd?.args[0] };
  }

  const cmd = program.commands.find((c) => c.name() === 'serve');
  const opts = cmd?.opts<ServeOptions>() ?? SERVE_DEFAULTS;
  return { command: 'serve', opts, file: cmd?.args[0] };
};

export const parseServeCommand = (argv: string[]): ParsedServeCommand => {
  const parsed = parseCli(argv);
  if (parsed.command !== 'serve') {
    return { command: 'serve', opts: SERVE_DEFAULTS, file: undefined };
  }
  return parsed;
};
