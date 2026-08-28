import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { makeFileMetaHandler } from '../../../adapters/http/fileMetaHandler';
import { AppConfig } from '../../../config/types';
import { buildRuntime, buildTestConfig } from './testRuntime';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-meta-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const write = (name: string, content: string): string => {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
};

const buildConfig = (filePath: string): AppConfig => buildTestConfig({ file: filePath });

const buildApp = (config: AppConfig): express.Express => {
  const app = express();
  app.get('/file-meta', makeFileMetaHandler(buildRuntime(config)));
  return app;
};

describe('makeFileMetaHandler', () => {
  it('returns filename, size, type, hasShebang for a plain file', async () => {
    const content = 'const x = 1;\n';
    const filePath = write('config.ts', content);
    const res = await request(buildApp(buildConfig(filePath))).get('/file-meta');
    expect(res.status).toBe(200);
    expect(res.body.filename).toBe('config.ts');
    expect(res.body.fullpath).toBeUndefined();
    expect(res.body.size).toBe(Buffer.byteLength(content));
    expect(res.body.type).toBe('text/typescript');
    expect(res.body.hasShebang).toBe(false);
  });

  it('detects shebang on the first line', async () => {
    const content = '#!/usr/bin/env node\nconsole.log("hi");\n';
    const filePath = write('script.js', content);
    const res = await request(buildApp(buildConfig(filePath))).get('/file-meta');
    expect(res.status).toBe(200);
    expect(res.body.hasShebang).toBe(true);
  });

  it('returns text/plain for unknown extensions', async () => {
    const filePath = write('myfile.xyz', 'data');
    const res = await request(buildApp(buildConfig(filePath))).get('/file-meta');
    expect(res.body.type).toBe('text/plain');
  });

  it('returns size 0 when file does not exist yet', async () => {
    const filePath = path.join(tmpDir, 'ghost.json');
    const res = await request(buildApp(buildConfig(filePath))).get('/file-meta');
    expect(res.status).toBe(200);
    expect(res.body.size).toBe(0);
    expect(res.body.type).toBe('application/json');
    expect(res.body.hasShebang).toBe(false);
  });

  it('returns correct MIME type for various extensions', async () => {
    const cases: Array<[string, string]> = [
      ['app.json', 'application/json'],
      ['style.css', 'text/css'],
      ['deploy.sh', 'text/x-shellscript'],
      ['data.yml', 'text/yaml'],
      ['README.md', 'text/markdown'],
    ];
    for (const [name, expectedType] of cases) {
      const filePath = write(name, '');
      const res = await request(buildApp(buildConfig(filePath))).get('/file-meta');
      expect(res.body.type).toBe(expectedType);
    }
  });
});
