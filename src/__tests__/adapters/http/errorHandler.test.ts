import express from 'express';
import request from 'supertest';
import { makeErrorHandler } from '../../../adapters/http/errorHandler';
import { silentLogger } from './testRuntime';

describe('makeErrorHandler', () => {
  it('returns 500 JSON and does not leak the error message', async () => {
    const app = express();
    app.get('/boom', () => {
      throw new Error('secret internals');
    });
    app.use(makeErrorHandler(silentLogger));

    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(res.body)).not.toMatch(/secret/);
  });
});
