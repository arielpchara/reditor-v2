import { Command } from 'commander';

export type ServeOptions = {
  port: string;
  host: string;
  forceDisableSecurity: boolean;
  tokenTtl: string;
  forceOtp: string | undefined;
  create: boolean;
};

export type ParsedServeCommand = {
  opts: ServeOptions;
  file: string | undefined;
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

  return program;
};

export const parseServeCommand = (argv: string[]): ParsedServeCommand => {
  const program = buildProgram();
  program.parse(argv);
  const cmd = program.commands.find((c) => c.name() === 'serve');
  const opts = cmd?.opts<ServeOptions>() ?? {
    port: '3000',
    host: 'localhost',
    forceDisableSecurity: false,
    tokenTtl: '300',
    forceOtp: undefined,
    create: false,
  };
  const file: string | undefined = cmd?.args[0];
  return { opts, file };
};
