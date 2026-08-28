import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../../../adapters/http/server';
import { buildRuntime, buildTestConfig } from './testRuntime';

describe('createApp', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-app-'));
    filePath = path.join(tmpDir, 'edit.txt');
    fs.writeFileSync(filePath, 'hello');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('registers GET /health', async () => {
    const app = createApp(buildRuntime(buildTestConfig({ file: filePath })));
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', securityEnabled: false });
  });

  it('sets clickjacking and MIME sniffing headers', async () => {
    const app = createApp(buildRuntime(buildTestConfig({ file: filePath })));
    const res = await request(app).get('/health');
    expect(res.headers['content-security-policy']).toBe("frame-ancestors 'none'");
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('serves GET /file before static fallback', async () => {
    const app = createApp(buildRuntime(buildTestConfig({ file: filePath })));
    const res = await request(app).get('/file');
    expect(res.status).toBe(200);
    expect(res.text).toBe('hello');
  });

  it('does not register OTP exchange when security is off', async () => {
    const app = createApp(buildRuntime(buildTestConfig({ file: filePath })));
    const res = await request(app).post('/auth/exchange-token').send({ otp: '123456' });
    expect(res.status).toBe(404);
  });
});
