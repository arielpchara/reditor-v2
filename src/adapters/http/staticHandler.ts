import express, { RequestHandler } from 'express';
import path from 'path';
import { Logger } from '../../core/logging';

const resolveWebDir = (): string =>
  __filename.endsWith('.ts')
    ? path.resolve(process.cwd(), 'dist/web')
    : path.resolve(__dirname, 'web');

export const createStaticHandler = (logger: Logger): RequestHandler => {
  const webDir = resolveWebDir();
  logger.info('Serving static files', { webDir });
  return express.static(webDir);
};
