import { Request, Response } from 'express';
import { AppConfig } from '../../config/types';
import { Logger } from '../../core/logging';
import { FileStore } from '../../core/files';
import { TokenService } from '../../core/security';

export type RouteHandler = (req: Request, res: Response) => void;

export type ServerConfig = Pick<AppConfig, 'port' | 'host' | 'useTls' | 'certPath' | 'keyPath'>;

export type HttpRuntime = {
  config: AppConfig;
  logger: Logger;
  files: FileStore;
  tokens: TokenService;
};
