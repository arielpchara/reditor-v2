import { ErrorRequestHandler } from 'express';
import { Logger } from '../../core/logging';

export const makeErrorHandler = (logger: Logger): ErrorRequestHandler => {
  return (err: unknown, req, res, _next): void => {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error('Unhandled error', { path: req.path, error: message, stack });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
