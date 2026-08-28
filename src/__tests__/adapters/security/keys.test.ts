import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  generateKeyPair,
  saveKeyPair,
  loadKeyPair,
  loadOrGenerateKeyPair,
} from '../../../adapters/security/keys';

describe('generateKeyPair', () => {
  it('returns PEM-encoded RSA keys', () => {
    const kp = generateKeyPair();
    expect(kp.privateKey).toMatch(/BEGIN PRIVATE KEY/);
    expect(kp.publicKey).toMatch(/BEGIN PUBLIC KEY/);
  });
});

describe('saveKeyPair / loadKeyPair', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-keys-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('round-trips a key pair through disk', () => {
    const original = generateKeyPair();
    saveKeyPair(original, tmpDir);
    const loaded = loadKeyPair(tmpDir);
    expect(loaded).toEqual(original);
  });

  it('writes the private key with mode 0o600', () => {
    saveKeyPair(generateKeyPair(), tmpDir);
    const mode = fs.statSync(path.join(tmpDir, 'private.pem')).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('returns undefined when either file is missing', () => {
    expect(loadKeyPair(tmpDir)).toBeUndefined();
  });
});

describe('loadOrGenerateKeyPair', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-keys-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates and persists keys when none exist', () => {
    const first = loadOrGenerateKeyPair(tmpDir);
    const second = loadOrGenerateKeyPair(tmpDir);
    expect(second).toEqual(first);
  });
});
