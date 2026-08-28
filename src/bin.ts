import path from 'path';
import { parseServeCommand } from './adapters/cli/program';
import { startServer } from './adapters/http';
import { generateOtp } from './core/security';
import { loadConfig } from './config';
import { logger, logFilePath } from './adapters/logger';
import { createFileStore } from './adapters/files';
import { generateKeyPair, createTokenService } from './adapters/security';
import { promptCreateFile } from './adapters/cli/promptCreate';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

async function main(): Promise<void> {
  const { opts, file: rawFile } = parseServeCommand(process.argv);

  if (!rawFile) {
    logger.error('Missing required file path. Usage: reditor serve <file>');
    process.exit(1);
  }

  const files = createFileStore();
  const absoluteFile = path.resolve(rawFile);
  const validation = files.validate(absoluteFile);

  if (!validation.ok) {
    const { error } = validation;

    if (error.kind === 'NOT_FOUND') {
      if (opts.create) {
        const created = files.create(absoluteFile);
        if (!created.ok) {
          logger.error('Failed to create file', {
            file: absoluteFile,
            error: created.error.message,
          });
          process.exit(1);
        }
        logger.info('File created', { file: absoluteFile });
      } else {
        const confirmed = await promptCreateFile(absoluteFile);
        if (!confirmed) {
          process.stdout.write('\n  Aborted.\n\n');
          process.exit(0);
        }
        const created = files.create(absoluteFile);
        if (!created.ok) {
          logger.error('Failed to create file', {
            file: absoluteFile,
            error: created.error.message,
          });
          process.exit(1);
        }
        logger.info('File created', { file: absoluteFile });
      }
    } else {
      switch (error.kind) {
        case 'IS_DIRECTORY':
          logger.error('Path points to a directory, not a file', { file: absoluteFile });
          break;
        case 'TOO_LARGE':
          logger.error('File exceeds maximum size for editor', {
            file: absoluteFile,
            sizeBytes: error.sizeBytes,
            maxBytes: error.maxBytes,
          });
          break;
        case 'NOT_TEXT':
          logger.error('File is not readable as text (binary content detected)', {
            file: absoluteFile,
          });
          break;
        case 'READ_ERROR':
          logger.error('Could not read file', { file: absoluteFile, error: error.message });
          break;
        case 'PATH_TRAVERSAL':
          logger.error('Path traversal detected', { file: absoluteFile });
          break;
      }
      process.exit(1);
    }
  }

  const port = Number(opts.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    logger.error('Invalid port', { port: opts.port });
    process.exit(1);
  }

  const tokenTtl = Number(opts.tokenTtl);
  if (!Number.isFinite(tokenTtl) || tokenTtl <= 0) {
    logger.error('Invalid token TTL', { tokenTtl: opts.tokenTtl });
    process.exit(1);
  }

  const securityEnabled = !opts.forceDisableSecurity;
  const isForced = securityEnabled && opts.forceOtp !== undefined;
  const otp = securityEnabled ? (opts.forceOtp ?? generateOtp()) : undefined;

  if (opts.forceDisableSecurity) {
    logger.warn('--force-disable-security is active: OTP and JWT auth are DISABLED');
    process.stdout.write('\n');
    process.stdout.write('  ⚠️  WARNING: Security is DISABLED via --force-disable-security\n');
    process.stdout.write('     Anyone with network access to this server can read the file.\n');
    process.stdout.write('     Never use this flag in production or on untrusted networks.\n');
    process.stdout.write('\n');
  }

  if (otp) {
    logger.info('OTP generated for session', { forced: isForced });
  }

  let keyPair: { privateKey: string; publicKey: string } | undefined;
  if (securityEnabled) {
    keyPair = generateKeyPair();
    logger.info('Generated ephemeral RSA-2048 signing keys for this process');
  }

  const config = loadConfig({
    port,
    host: opts.host,
    securityEnabled,
    otp,
    tokenTtl,
    jwtPrivateKey: keyPair?.privateKey,
    jwtPublicKey: keyPair?.publicKey,
    file: absoluteFile,
  });

  if (config.securityEnabled && otp) {
    logger.info('Security mode enabled', { tokenTtlSeconds: tokenTtl });
    if (isForced) {
      logger.warn('--force-otp is set; OTP is predictable and should never be used in production');
    }
    process.stdout.write('\n');
    process.stdout.write('  🔐 Security enabled\n');
    process.stdout.write(`  🔑 One-Time Password: ${otp}\n`);
    process.stdout.write(`  ⏱  Token TTL: ${tokenTtl}s\n`);
    process.stdout.write('     POST /auth/exchange-token with { "otp": "<code>" } to get a JWT.\n');
    if (!LOOPBACK_HOSTS.has(opts.host)) {
      logger.warn('Non-loopback bind: 3 failed OTP attempts will shut down the process', {
        host: opts.host,
      });
      process.stdout.write(
        `  ⚠️  Bound to ${opts.host}: 3 failed OTP attempts will shut down the server.\n`,
      );
    }
    process.stdout.write('\n');
  }

  logger.info('Starting reditor server', {
    host: config.host,
    port: config.port,
    useTls: config.useTls,
    file: config.file,
    logFilePath,
  });

  await startServer({
    config,
    logger,
    files,
    tokens: createTokenService(),
  });
}

main().catch((err: Error) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});
