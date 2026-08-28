import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';
import { KeyPair } from '../../core/security';

const PRIVATE_KEY_FILE = 'private.pem';
const PUBLIC_KEY_FILE = 'public.pem';

export const generateKeyPair = (): KeyPair => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKey, publicKey };
};

export const saveKeyPair = (keyPair: KeyPair, keysDir: string): void => {
  fs.mkdirSync(keysDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(keysDir, PRIVATE_KEY_FILE), keyPair.privateKey, { mode: 0o600 });
  fs.writeFileSync(path.join(keysDir, PUBLIC_KEY_FILE), keyPair.publicKey, { mode: 0o644 });
};

export const loadKeyPair = (keysDir: string): KeyPair | undefined => {
  const privatePath = path.join(keysDir, PRIVATE_KEY_FILE);
  const publicPath = path.join(keysDir, PUBLIC_KEY_FILE);
  if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) return undefined;
  return {
    privateKey: fs.readFileSync(privatePath, 'utf8'),
    publicKey: fs.readFileSync(publicPath, 'utf8'),
  };
};

export const loadOrGenerateKeyPair = (keysDir: string): KeyPair => {
  const existing = loadKeyPair(keysDir);
  if (existing) {
    return existing;
  }
  const keyPair = generateKeyPair();
  saveKeyPair(keyPair, keysDir);
  return keyPair;
};
