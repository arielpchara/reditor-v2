import { Request, Response, NextFunction } from 'express';

export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};
