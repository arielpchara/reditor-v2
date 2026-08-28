import fs from 'fs';
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

const detectShebang = (filepath: string): boolean => {
  try {
    const fd = fs.openSync(filepath, 'r');
    const buf = Buffer.alloc(2);
    const bytesRead = fs.readSync(fd, buf, 0, 2, 0);
    fs.closeSync(fd);
    return bytesRead === 2 && buf[0] === 0x23 && buf[1] === 0x21; // '#!'
  } catch {
    return false;
  }
};

export const makeFileMetaHandler = ({ config, logger }: HttpRuntime): RouteHandler => {
  return (_req: Request, res: Response): void => {
    const fullpath = path.resolve(config.file);
    const filename = path.basename(fullpath);

    let size = 0;
    try {
      size = fs.statSync(fullpath).size;
    } catch {
      // file might not exist yet
    }

    const type = getMimeType(fullpath);
    const hasShebang = detectShebang(fullpath);

    logger.debug('Served file metadata', { filename, fullpath, size, type, hasShebang });
    res.json({ filename, fullpath, size, type, hasShebang });
  };
};
