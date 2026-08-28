import jwt from 'jsonwebtoken';
import { JwtPayload, KeyPair, TokenResult, TokenService } from '../../core/security';

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const createToken = (privateKey: string, ttlSeconds: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: 'reditor',
    iat: now,
    exp: now + ttlSeconds,
  };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
};

export const verifyToken = (token: string, publicKey: string): TokenResult => {
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    if (typeof decoded !== 'object' || decoded === null) {
      return { ok: false, error: 'Invalid token payload' };
    }
    const payload = decoded as JwtPayload;
    return { ok: true, token, expiresIn: payload.exp - payload.iat };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
};

export const buildTokenResult = (
  keys: KeyPair,
  ttlSeconds: number,
): { token: string; expiresIn: number } => ({
  token: createToken(keys.privateKey, ttlSeconds),
  expiresIn: ttlSeconds,
});

export const createTokenService = (): TokenService => ({
  buildTokenResult,
  verifyToken,
});
