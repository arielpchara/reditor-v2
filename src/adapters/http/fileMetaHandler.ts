import path from 'path';
import { Request, Response } from 'express';
import { HttpRuntime, RouteHandler } from './types';

const MIME_MAP: Record<string, string> = {
  ts: 'text/typescript',
  tsx: 'text/tsx',
  js: 'text/javascript',
  jsx: 'text/jsx',
  mjs: 'text/javascript',
  cjs: 'text/javascript',
  json: 'application/json',
  html: 'text/html',
  xml: 'text/xml',
  svg: 'image/svg+xml',
  css: 'text/css',
  scss: 'text/x-scss',
  sh: 'text/x-shellscript',
  bash: 'text/x-shellscript',
  zsh: 'text/x-shellscript',
  yml: 'text/yaml',
  yaml: 'text/yaml',
  md: 'text/markdown',
  mdx: 'text/mdx',
  py: 'text/x-python',
  rs: 'text/x-rust',
  go: 'text/x-go',
  sql: 'text/x-sql',
  txt: 'text/plain',
  env: 'text/plain',
  toml: 'text/x-toml',
  ini: 'text/x-ini',
  conf: 'text/plain',
};

const getMimeType = (filepath: string): string => {
  const ext = path.extname(filepath).replace('.', '').toLowerCase();
  return MIME_MAP[ext] ?? 'text/plain';
};

export const makeFileMetaHandler = ({ config, logger, files }: HttpRuntime): RouteHandler => {
  return (_req: Request, res: Response): void => {
    const filename = path.basename(config.file);
    const { sizeBytes, hasShebang } = files.meta(config.file);
    const type = getMimeType(config.file);

    logger.debug('Served file metadata', { filename, size: sizeBytes, type, hasShebang });
    res.json({ filename, size: sizeBytes, type, hasShebang });
  };
};
