import request from 'supertest';
import express from 'express';
import { makeHealthHandler } from '../../../adapters/http/handlers';
import { AppConfig } from '../../../config/types';
import { buildRuntime, buildTestConfig } from './testRuntime';

const buildApp = (config: AppConfig) => {
  const app = express();
  app.get('/health', makeHealthHandler(buildRuntime(config)));
  return app;
};

describe('GET /health', () => {
  it('returns status ok', async () => {
    const app = buildApp(buildTestConfig({ securityEnabled: true, otp: '123456' }));
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns securityEnabled: true when security is on', async () => {
    const app = buildApp(buildTestConfig({ securityEnabled: true }));
    const res = await request(app).get('/health');
    expect(res.body.securityEnabled).toBe(true);
  });

  it('returns securityEnabled: false when security is off', async () => {
    const app = buildApp(buildTestConfig({ securityEnabled: false }));
    const res = await request(app).get('/health');
    expect(res.body.securityEnabled).toBe(false);
  });
});
