import { Express } from 'express';
import { HttpRuntime } from './types';
import { makeHealthHandler } from './handlers';
import { makeExchangeTokenHandler } from './authHandlers';
import { makeFileHandler } from './fileHandlers';
import { makeFileSaveHandler } from './fileSaveHandler';
import { makeFileMetaHandler } from './fileMetaHandler';
import { makeStatusHandler } from './statusHandler';
import { makeAuthMiddleware } from './authMiddleware';

export const registerRoutes = (app: Express, runtime: HttpRuntime): void => {
  const { config, logger } = runtime;

  app.get('/health', makeHealthHandler(runtime));
  logger.info('Registered route: GET /health');

  if (config.securityEnabled) {
    app.post('/auth/exchange-token', makeExchangeTokenHandler(runtime));
    logger.info('Registered route: POST /auth/exchange-token (security enabled)');
  }

  const auth = makeAuthMiddleware(runtime);

  app.get('/status', auth, makeStatusHandler(runtime));
  logger.info('Registered route: GET /status', { authRequired: config.securityEnabled });

  app.get('/file-meta', auth, makeFileMetaHandler(runtime));
  logger.info('Registered route: GET /file-meta', { authRequired: config.securityEnabled });

  app.get('/file', auth, makeFileHandler(runtime));
  logger.info('Registered route: GET /file', {
    authRequired: config.securityEnabled,
    file: config.file,
  });

  app.put('/file', auth, makeFileSaveHandler(runtime));
  logger.info('Registered route: PUT /file', { authRequired: config.securityEnabled });
};
