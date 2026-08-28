import { Request, Response } from 'express';
import { HttpRuntime, RouteHandler } from './types';

export const makeHealthHandler = ({ config, logger }: HttpRuntime): RouteHandler => {
  return (_req: Request, res: Response): void => {
    logger.debug('Health check requested');
    res.json({ status: 'ok', securityEnabled: config.securityEnabled });
  };
};
