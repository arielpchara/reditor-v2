import path from 'path';
import { MAX_FILE_SIZE_BYTES } from './types';

export const isTextBuffer = (buf: Buffer): boolean => {
  if (buf.includes(0x00)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
};

export const isWithinRoot = (rootDir: string, resolvedFilePath: string): boolean => {
  const normalRoot = path.resolve(rootDir) + path.sep;
  const normalFile = path.resolve(resolvedFilePath);
  return normalFile.startsWith(normalRoot) || normalFile === path.resolve(rootDir);
};

export const isWithinSizeLimit = (
  sizeBytes: number,
  maxBytes: number = MAX_FILE_SIZE_BYTES,
): boolean => sizeBytes <= maxBytes;
