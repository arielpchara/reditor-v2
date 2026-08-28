import { getSessionToken } from './otpApi';

export const getAuthHeader = (): Record<string, string> => {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchWithAuth = (url: string, init: RequestInit = {}): Promise<Response> =>
  fetch(url, { ...init, headers: { ...getAuthHeader(), ...(init.headers ?? {}) } });
