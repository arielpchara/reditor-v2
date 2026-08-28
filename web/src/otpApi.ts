export const MAX_OTP_ATTEMPTS = 3;

const TOKEN_KEY = 'reditor_token';
const EXPIRES_AT_KEY = 'reditor_token_expires_at';

export type OtpExchangeResult =
  | { ok: true; token: string; expiresIn: number }
  | { ok: false; error: string; shutdown: boolean };

export type FetchFn = typeof globalThis.fetch;

export const storeSessionToken = (token: string, expiresIn: number): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000));
};

export const clearSessionToken = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_AT_KEY);
};

export const getSessionToken = (): string | null => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_AT_KEY));
  if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) {
    clearSessionToken();
    return null;
  }
  return token;
};

const parseTokenResponse = (data: unknown): { token: string; expiresIn: number } | undefined => {
  if (typeof data !== 'object' || data === null) return undefined;
  const record = data as { token?: unknown; expiresIn?: unknown };
  if (typeof record.token !== 'string' || record.token.length === 0) return undefined;
  const expiresIn =
    typeof record.expiresIn === 'number' && record.expiresIn > 0 ? record.expiresIn : 300;
  return { token: record.token, expiresIn };
};

export const exchangeToken = async (
  otp: string,
  fetchFn: FetchFn = fetch,
): Promise<OtpExchangeResult> => {
  let res: Response;
  try {
    res = await fetchFn('/auth/exchange-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });
  } catch {
    return { ok: false, error: 'Network error — could not reach server', shutdown: false };
  }

  if (res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, error: 'Invalid server response', shutdown: false };
    }
    const parsed = parseTokenResponse(data);
    if (!parsed) {
      return { ok: false, error: 'Invalid server response', shutdown: false };
    }
    return { ok: true, token: parsed.token, expiresIn: parsed.expiresIn };
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  const shutdown = res.status === 401 && /shutting down/i.test(body.error ?? '');
  return { ok: false, error: body.error ?? `Error ${res.status}`, shutdown };
};
