import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exchangeToken,
  MAX_OTP_ATTEMPTS,
  storeSessionToken,
  clearSessionToken,
  getSessionToken,
} from '../otpApi';

const mockFetchOk = (token: string, expiresIn = 300) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ token, expiresIn }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

const mockFetchFail = (error: string, status = 401) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ error }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

const mockFetchNetworkError = () => vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

describe('exchangeToken', () => {
  it('returns ok:true with token and expiresIn on success', async () => {
    const fetchFn = mockFetchOk('jwt-abc', 600);
    const result = await exchangeToken('123456', fetchFn);
    expect(result).toEqual({ ok: true, token: 'jwt-abc', expiresIn: 600 });
  });

  it('defaults expiresIn to 300 when omitted', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt-abc' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await exchangeToken('123456', fetchFn);
    expect(result).toEqual({ ok: true, token: 'jwt-abc', expiresIn: 300 });
  });

  it('returns ok:false with error on 401', async () => {
    const fetchFn = mockFetchFail('Invalid OTP');
    const result = await exchangeToken('wrong', fetchFn);
    expect(result).toEqual({ ok: false, error: 'Invalid OTP', shutdown: false });
  });

  it('returns shutdown:true when server sends shutdown message', async () => {
    const fetchFn = mockFetchFail(
      'Invalid OTP. Maximum attempts exceeded — server is shutting down.',
      401,
    );
    const result = await exchangeToken('wrong', fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.shutdown).toBe(true);
    }
  });

  it('returns shutdown:false for non-shutdown 401', async () => {
    const fetchFn = mockFetchFail('Invalid OTP', 401);
    const result = await exchangeToken('wrong', fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.shutdown).toBe(false);
    }
  });

  it('returns network error on fetch failure', async () => {
    const fetchFn = mockFetchNetworkError();
    const result = await exchangeToken('otp', fetchFn);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/network error/i);
    }
  });

  it('returns invalid server response when 200 body is not JSON', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('not-json', { status: 200 }));
    const result = await exchangeToken('otp', fetchFn);
    expect(result).toEqual({ ok: false, error: 'Invalid server response', shutdown: false });
  });

  it('returns invalid server response when token is missing', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ expiresIn: 300 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await exchangeToken('otp', fetchFn);
    expect(result).toEqual({ ok: false, error: 'Invalid server response', shutdown: false });
  });

  it('calls the correct endpoint with the OTP', async () => {
    const fetchFn = mockFetchOk('tok');
    await exchangeToken('myotp', fetchFn);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/auth/exchange-token');
    expect(JSON.parse(init.body as string)).toEqual({ otp: 'myotp' });
  });
});

describe('session token storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('stores and returns a valid token', () => {
    storeSessionToken('abc', 300);
    expect(getSessionToken()).toBe('abc');
  });

  it('returns null and clears storage after expiry', () => {
    storeSessionToken('abc', 300);
    vi.setSystemTime(new Date('2026-01-01T00:06:00Z'));
    expect(getSessionToken()).toBeNull();
    expect(sessionStorage.getItem('reditor_token')).toBeNull();
  });

  it('clearSessionToken removes the token', () => {
    storeSessionToken('abc', 300);
    clearSessionToken();
    expect(getSessionToken()).toBeNull();
  });
});

describe('MAX_OTP_ATTEMPTS', () => {
  it('is 3', () => {
    expect(MAX_OTP_ATTEMPTS).toBe(3);
  });
});
