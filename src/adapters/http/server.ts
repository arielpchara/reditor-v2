import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import selfsigned from 'selfsigned';
import { AppConfig } from '../../config/types';
import { registerRoutes } from './routes';
import { createStaticHandler } from './staticHandler';
import { HttpRuntime } from './types';
import { securityHeaders } from './securityHeaders';
import { makeErrorHandler } from './errorHandler';

export const createApp = (runtime: HttpRuntime): express.Express => {
  const { config, logger } = runtime;
  logger.info('Initialising Express app', { useTls: config.useTls, file: config.file });
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(securityHeaders);

  app.use((req, _res, next) => {
    logger.info('Incoming request', { method: req.method, path: req.path, ip: req.ip });
    next();
  });

  registerRoutes(app, runtime);
  app.use(createStaticHandler(logger));
  app.use(makeErrorHandler(logger));
  return app;
};

const resolveTlsOptions = async (
  config: AppConfig,
  logger: HttpRuntime['logger'],
): Promise<{ key: string; cert: string }> => {
  if (config.certPath && config.keyPath) {
    logger.info('Using configured TLS certificate and key', {
      certPath: config.certPath,
      keyPath: config.keyPath,
    });
    return {
      cert: fs.readFileSync(config.certPath, 'utf8'),
      key: fs.readFileSync(config.keyPath, 'utf8'),
    };
  }
  logger.info('No TLS cert configured; generating self-signed certificate for development');
  const attrs = [{ name: 'commonName', value: config.host }];
  const pems = await selfsigned.generate(attrs, { algorithm: 'sha256' });
  return { key: pems.private, cert: pems.cert };
};

export const startServer = (runtime: HttpRuntime): Promise<http.Server | https.Server> =>
  new Promise((resolve, reject) => {
    const { config, logger } = runtime;
    const app = createApp(runtime);

    if (config.useTls) {
      resolveTlsOptions(config, logger)
        .then((tlsOptions) => {
          const server = https.createServer(tlsOptions, app);
          server.listen(config.port, config.host, () => {
            logger.info('Server listening', {
              protocol: 'https',
              host: config.host,
              port: config.port,
            });
            resolve(server);
          });
          server.on('error', reject);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? err.stack : undefined;
          logger.error('Failed to resolve TLS options', { error: message, stack });
          reject(err);
        });
    } else {
      const server = http.createServer(app);
      server.listen(config.port, config.host, () => {
        logger.info('Server listening', {
          protocol: 'http',
          host: config.host,
          port: config.port,
        });
        resolve(server);
      });
      server.on('error', reject);
    }
  });
