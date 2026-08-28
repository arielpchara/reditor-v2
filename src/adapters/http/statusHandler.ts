import path from 'path';
import { Request, Response } from 'express';
import { HttpRuntime, RouteHandler } from './types';

export const makeStatusHandler = ({ config, logger }: HttpRuntime): RouteHandler => {
  return (_req: Request, res: Response): void => {
    const directory = path.dirname(config.file);
    logger.debug('Serve status requested', {
      host: config.host,
      port: config.port,
      directory,
    });
    res.json({
      status: 'ok',
      host: config.host,
      port: config.port,
      directory,
      useTls: config.useTls,
      securityEnabled: config.securityEnabled,
    });
  };
};
