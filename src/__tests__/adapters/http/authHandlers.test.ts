import request from 'supertest';
import express from 'express';
import { makeExchangeTokenHandler, MAX_OTP_ATTEMPTS } from '../../../adapters/http/authHandlers';
import { AppConfig } from '../../../config/types';
import { buildRuntime, buildTestConfig as baseConfig } from './testRuntime';

const buildTestConfig = (overrides: Partial<AppConfig> = {}): AppConfig =>
  baseConfig({ securityEnabled: true, otp: '123456', ...overrides });

const buildApp = (config: AppConfig, exit?: (code: number) => void) => {
  const app = express();
  app.use(express.json());
  app.post('/auth/exchange-token', makeExchangeTokenHandler(buildRuntime(config), { exit }));
  return app;
};

describe('POST /auth/exchange-token', () => {
  it('returns 401 when OTP is missing', async () => {
    const app = buildApp(buildTestConfig());
    const res = await request(app).post('/auth/exchange-token').send({});
    expect(res.status).toBe(401);
  });

  it('returns 401 when OTP is wrong', async () => {
    const app = buildApp(buildTestConfig());
    const res = await request(app).post('/auth/exchange-token').send({ otp: '000000' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token when OTP is correct', async () => {
    const app = buildApp(buildTestConfig());
    const res = await request(app).post('/auth/exchange-token').send({ otp: '123456' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('expiresIn', 300);
  });

  it('returns a valid 3-part JWT', async () => {
    const app = buildApp(buildTestConfig());
    const res = await request(app).post('/auth/exchange-token').send({ otp: '123456' });
    expect(res.body.token.split('.')).toHaveLength(3);
  });

  it('returns 403 when security is disabled', async () => {
    const app = buildApp(buildTestConfig({ securityEnabled: false }));
    const res = await request(app).post('/auth/exchange-token').send({ otp: '123456' });
    expect(res.status).toBe(403);
  });

  it('returns 500 when private key is missing', async () => {
    const app = buildApp(buildTestConfig({ jwtPrivateKey: undefined }));
    const res = await request(app).post('/auth/exchange-token').send({ otp: '123456' });
    expect(res.status).toBe(500);
  });

  it('rejects a second exchange after a successful one', async () => {
    const app = buildApp(buildTestConfig());
    const first = await request(app).post('/auth/exchange-token').send({ otp: '123456' });
    expect(first.status).toBe(200);
    const second = await request(app).post('/auth/exchange-token').send({ otp: '123456' });
    expect(second.status).toBe(401);
    expect(second.body.error).toMatch(/already been used/i);
  });

  it('returns 401 when body is missing', async () => {
    const app = buildApp(buildTestConfig());
    const res = await request(app).post('/auth/exchange-token');
    expect(res.status).toBe(401);
  });

  describe('OTP rate limiting', () => {
    it('returns attemptsLeft on failed attempt (below max)', async () => {
      const exit = jest.fn();
      const app = buildApp(buildTestConfig(), exit);
      const res = await request(app).post('/auth/exchange-token').send({ otp: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('attemptsLeft', MAX_OTP_ATTEMPTS - 1);
      expect(exit).not.toHaveBeenCalled();
    });

    it('calls exit(1) after MAX_OTP_ATTEMPTS failures', async () => {
      jest.useFakeTimers();
      const exit = jest.fn();
      const app = buildApp(buildTestConfig(), exit);

      for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
        await request(app).post('/auth/exchange-token').send({ otp: 'wrong' });
      }

      jest.runAllTimers();
      expect(exit).toHaveBeenCalledWith(1);
      jest.useRealTimers();
    });

    it('returns 401 with shutdown message on final attempt', async () => {
      jest.useFakeTimers();
      const exit = jest.fn();
      const app = buildApp(buildTestConfig(), exit);

      let lastStatus = 0;
      let lastError = '';
      for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
        const res = await request(app).post('/auth/exchange-token').send({ otp: 'wrong' });
        lastStatus = res.status;
        lastError = res.body.error as string;
      }

      expect(lastStatus).toBe(401);
      expect(lastError).toMatch(/shutting down/i);
      jest.useRealTimers();
    });

    it('resets the strike counter after a successful exchange', async () => {
      jest.useFakeTimers();
      const exit = jest.fn();
      const app = buildApp(buildTestConfig(), exit);

      await request(app).post('/auth/exchange-token').send({ otp: 'wrong' });
      await request(app).post('/auth/exchange-token').send({ otp: 'wrong' });
      const success = await request(app).post('/auth/exchange-token').send({ otp: '123456' });
      expect(success.status).toBe(200);

      const reused = await request(app).post('/auth/exchange-token').send({ otp: 'wrong' });
      expect(reused.status).toBe(401);
      expect(reused.body.error).toMatch(/already been used/i);

      jest.runAllTimers();
      expect(exit).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('resets counter per handler instance (not global)', async () => {
      const exit1 = jest.fn();
      const exit2 = jest.fn();
      const app1 = buildApp(buildTestConfig(), exit1);
      const app2 = buildApp(buildTestConfig(), exit2);

      // Exhaust app1
      jest.useFakeTimers();
      for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
        await request(app1).post('/auth/exchange-token').send({ otp: 'wrong' });
      }
      jest.runAllTimers();
      expect(exit1).toHaveBeenCalledWith(1);

      // app2 should be unaffected
      const res = await request(app2).post('/auth/exchange-token').send({ otp: '123456' });
      expect(res.status).toBe(200);
      expect(exit2).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
