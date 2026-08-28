export type Otp = string;

export type SecurityConfig = {
  enabled: boolean;
  otp: Otp | undefined;
};

export type KeyPair = {
  privateKey: string;
  publicKey: string;
};

export type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
};

export type TokenResult =
  | { ok: true; token: string; expiresIn: number }
  | { ok: false; error: string };

export type TokenService = {
  buildTokenResult: (keys: KeyPair, ttlSeconds: number) => { token: string; expiresIn: number };
  verifyToken: (token: string, publicKey: string) => TokenResult;
};
