import { AppConfig } from '../../../config/types';
import { Logger } from '../../../core/logging';
import { HttpRuntime } from '../../../adapters/http/types';
import { createFileStore } from '../../../adapters/files';
import { createTokenService, generateKeyPair } from '../../../adapters/security';

export const silentLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

export const buildTestConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
  const kp = generateKeyPair();
  return {
    port: 3000,
    host: 'localhost',
    useTls: false,
    certPath: undefined,
    keyPath: undefined,
    securityEnabled: false,
    otp: undefined,
    tokenTtl: 300,
    jwtPrivateKey: kp.privateKey,
    jwtPublicKey: kp.publicKey,
    file: process.cwd() + '/package.json',
    ...overrides,
  };
};

export const buildRuntime = (
  config: AppConfig,
  overrides: Partial<HttpRuntime> = {},
): HttpRuntime => ({
  config,
  logger: silentLogger,
  files: createFileStore(),
  tokens: createTokenService(),
  ...overrides,
});
