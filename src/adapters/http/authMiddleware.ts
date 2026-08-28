import { Request, Response, NextFunction } from 'express';
import { HttpRuntime } from './types';

export const makeAuthMiddleware =
  ({ config, logger, tokens }: HttpRuntime) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!config.securityEnabled) {
      next();
      return;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('Request blocked: missing or malformed Authorization header', {
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({ error: 'Authorization header missing or malformed' });
      return;
    }

    const token = authHeader.slice(7);
    const result = tokens.verifyToken(token, config.jwtPublicKey ?? '');

    if (!result.ok) {
      logger.warn('Request blocked: invalid or expired JWT token', {
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    logger.debug('Request authorized via JWT', { path: req.path, ip: req.ip });
    next();
  };
