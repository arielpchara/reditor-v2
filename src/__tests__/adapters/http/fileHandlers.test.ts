import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { makeFileHandler } from '../../../adapters/http/fileHandlers';
import { makeAuthMiddleware } from '../../../adapters/http/authMiddleware';
import { createToken } from '../../../adapters/security';
import { AppConfig } from '../../../config/types';
import { MAX_FILE_SIZE_BYTES } from '../../../core/files';
import { buildRuntime, buildTestConfig } from './testRuntime';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-http-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const write = (name: string, content: Buffer | string): string => {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
};

const buildConfig = (filePath: string, overrides: Partial<AppConfig> = {}): AppConfig =>
  buildTestConfig({ file: filePath, ...overrides });

const buildApp = (config: AppConfig) => {
  const runtime = buildRuntime(config);
  const app = express();
  app.use(express.json());
  app.get('/file', makeAuthMiddleware(runtime), makeFileHandler(runtime));
  return app;
};

describe('GET /file — no security', () => {
  it('returns 200 with raw file content', async () => {
    const filePath = write('hello.txt', 'hello world');
    const app = buildApp(buildConfig(filePath));
    const res = await request(app).get('/file');
    expect(res.status).toBe(200);
    expect(res.text).toBe('hello world');
  });

  it('returns 404 when the configured file is missing', async () => {
    const app = buildApp(buildConfig(path.join(tmpDir, 'missing.txt')));
    const res = await request(app).get('/file');
    expect(res.status).toBe(404);
  });

  it('returns 422 for a non-ASCII file', async () => {
    const filePath = write('binary.bin', Buffer.from([65, 200, 201]));
    const app = buildApp(buildConfig(filePath));
    const res = await request(app).get('/file');
    expect(res.status).toBe(422);
  });

  it('returns 413 when file exceeds size limit', async () => {
    const filePath = write('big.txt', Buffer.alloc(MAX_FILE_SIZE_BYTES + 1, 65));
    const app = buildApp(buildConfig(filePath));
    const res = await request(app).get('/file');
    expect(res.status).toBe(413);
  });
});

describe('GET /file — with security', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const filePath = write('secret.txt', 'top secret');
    const config = buildConfig(filePath, { securityEnabled: true });
    const app = buildApp(config);
    const res = await request(app).get('/file');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const filePath = write('secret.txt', 'top secret');
    const config = buildConfig(filePath, { securityEnabled: true });
    const app = buildApp(config);
    const res = await request(app).get('/file').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid JWT', async () => {
    const filePath = write('secret.txt', 'top secret');
    const config = buildConfig(filePath, { securityEnabled: true });
    const token = createToken(config.jwtPrivateKey!, config.tokenTtl);
    const app = buildApp(config);
    const res = await request(app).get('/file').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.text).toBe('top secret');
  });
});
