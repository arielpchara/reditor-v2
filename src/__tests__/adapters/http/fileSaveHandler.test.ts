import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { makeFileSaveHandler } from '../../../adapters/http/fileSaveHandler';
import { makeAuthMiddleware } from '../../../adapters/http/authMiddleware';
import { createToken } from '../../../adapters/security';
import { AppConfig } from '../../../config/types';
import { MAX_FILE_SIZE_BYTES } from '../../../core/files';
import { buildRuntime, buildTestConfig } from './testRuntime';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-save-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const write = (name: string, content: string): string => {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
};

const buildConfig = (filePath: string, overrides: Partial<AppConfig> = {}): AppConfig =>
  buildTestConfig({ file: filePath, ...overrides });

const buildApp = (config: AppConfig) => {
  const runtime = buildRuntime(config);
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.put('/file', makeAuthMiddleware(runtime), makeFileSaveHandler(runtime));
  return app;
};

describe('PUT /file — no security', () => {
  it('returns 204 and writes content to the file', async () => {
    const filePath = write('edit.txt', 'original');
    const app = buildApp(buildConfig(filePath));
    const res = await request(app).put('/file').send({ content: 'updated content' });
    expect(res.status).toBe(204);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('updated content');
  });

  it('returns 400 when content field is missing', async () => {
    const filePath = write('edit.txt', 'original');
    const app = buildApp(buildConfig(filePath));
    const res = await request(app).put('/file').send({});
    expect(res.status).toBe(400);
  });

  it('returns 413 when content exceeds size limit', async () => {
    const filePath = write('edit.txt', 'original');
    const app = buildApp(buildConfig(filePath));
    const bigContent = 'A'.repeat(MAX_FILE_SIZE_BYTES + 1);
    const res = await request(app).put('/file').send({ content: bigContent });
    expect(res.status).toBe(413);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('original');
  });
});

describe('PUT /file — with security', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const filePath = write('secret.txt', 'original');
    const app = buildApp(buildConfig(filePath, { securityEnabled: true }));
    const res = await request(app).put('/file').send({ content: 'updated' });
    expect(res.status).toBe(401);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('original');
  });

  it('returns 204 with a valid JWT', async () => {
    const filePath = write('secret.txt', 'original');
    const config = buildConfig(filePath, { securityEnabled: true });
    const token = createToken(config.jwtPrivateKey!, config.tokenTtl);
    const app = buildApp(config);
    const res = await request(app)
      .put('/file')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'updated' });
    expect(res.status).toBe(204);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('updated');
  });
});
