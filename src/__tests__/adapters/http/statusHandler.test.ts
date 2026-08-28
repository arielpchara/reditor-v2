import request from 'supertest';
import express from 'express';
import path from 'path';
import { makeStatusHandler } from '../../../adapters/http/statusHandler';
import { AppConfig } from '../../../config/types';
import { buildRuntime, buildTestConfig } from './testRuntime';

const buildApp = (config: AppConfig) => {
  const app = express();
  app.get('/status', makeStatusHandler(buildRuntime(config)));
  return app;
};

describe('GET /status', () => {
  it('returns serve host, port, directory, tls, and security flags', async () => {
    const file = path.join('/etc', 'nginx', 'nginx.conf');
    const app = buildApp(
      buildTestConfig({
        file,
        host: '127.0.0.1',
        port: 8080,
        useTls: true,
        securityEnabled: false,
      }),
    );
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      host: '127.0.0.1',
      port: 8080,
      directory: path.dirname(file),
      useTls: true,
      securityEnabled: false,
    });
  });

  it('returns securityEnabled true when OTP is on', async () => {
    const app = buildApp(buildTestConfig({ securityEnabled: true, useTls: false }));
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body.securityEnabled).toBe(true);
    expect(res.body.useTls).toBe(false);
  });
});
