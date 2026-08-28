import { Request, Response } from 'express';
import { otpMatches } from '../../core/security/otp';
import { HttpRuntime, RouteHandler } from './types';

export const MAX_OTP_ATTEMPTS = 3;

type ExchangeHandlerDeps = {
  exit?: (code: number) => void;
};

const readOtp = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null) return undefined;
  if (!('otp' in body)) return undefined;
  const value: unknown = (body as { otp: unknown }).otp;
  return typeof value === 'string' ? value : undefined;
};

export const makeExchangeTokenHandler = (
  { config, logger, tokens }: HttpRuntime,
  deps: ExchangeHandlerDeps = {},
): RouteHandler => {
  const exit = deps.exit ?? ((code) => process.exit(code));
  let failedAttempts = 0;
  let otp = config.otp;
  let consumed = false;

  return (req: Request, res: Response): void => {
    if (!config.securityEnabled || !config.otp) {
      logger.warn('Token exchange rejected because security is disabled');
      res.status(403).json({ error: 'Security is not enabled' });
      return;
    }

    if (consumed || !otp) {
      logger.warn('Token exchange rejected: OTP already used', { ip: req.ip });
      res.status(401).json({ error: 'OTP has already been used' });
      return;
    }

    const provided = readOtp(req.body);

    if (!provided || !otpMatches(provided, otp)) {
      failedAttempts += 1;
      const remaining = MAX_OTP_ATTEMPTS - failedAttempts;
      logger.warn('Token exchange rejected due to invalid OTP', {
        hasOtp: Boolean(provided),
        ip: req.ip,
        failedAttempts,
        remaining,
      });

      if (failedAttempts >= MAX_OTP_ATTEMPTS) {
        logger.error(
          `OTP max attempts (${MAX_OTP_ATTEMPTS}) exceeded — shutting down for security`,
          { ip: req.ip },
        );
        res
          .status(401)
          .json({ error: 'Invalid OTP. Maximum attempts exceeded — server is shutting down.' });
        setTimeout(() => exit(1), 200);
        return;
      }

      res.status(401).json({ error: 'Invalid OTP', attemptsLeft: remaining });
      return;
    }

    if (!config.jwtPrivateKey) {
      logger.error('Token exchange failed: signing key not available');
      res.status(500).json({ error: 'Signing key not available' });
      return;
    }

    const result = tokens.buildTokenResult(
      { privateKey: config.jwtPrivateKey, publicKey: config.jwtPublicKey ?? '' },
      config.tokenTtl,
    );

    failedAttempts = 0;
    consumed = true;
    otp = undefined;
    logger.info('Token exchange succeeded', { ip: req.ip, ttlSeconds: config.tokenTtl });
    res.json(result);
  };
};
