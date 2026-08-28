import fs from 'fs';
import path from 'path';
import {
  FileResult,
  MAX_FILE_SIZE_BYTES,
  isTextBuffer,
  isWithinRoot,
  isWithinSizeLimit,
} from '../../core/files';

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const readFile = (rootDir: string, relativePath: string): FileResult => {
  const resolvedPath = path.resolve(rootDir, relativePath);

  if (!isWithinRoot(rootDir, resolvedPath)) {
    return { ok: false, error: { kind: 'PATH_TRAVERSAL', path: relativePath } };
  }

  if (!fs.existsSync(resolvedPath)) {
    return { ok: false, error: { kind: 'NOT_FOUND', path: relativePath } };
  }

  const stat = fs.statSync(resolvedPath);

  if (stat.isDirectory()) {
    return { ok: false, error: { kind: 'IS_DIRECTORY', path: relativePath } };
  }

  if (!isWithinSizeLimit(stat.size)) {
    return {
      ok: false,
      error: {
        kind: 'TOO_LARGE',
        path: relativePath,
        sizeBytes: stat.size,
        maxBytes: MAX_FILE_SIZE_BYTES,
      },
    };
  }

  let buf: Buffer;
  try {
    buf = fs.readFileSync(resolvedPath);
  } catch (e) {
    return {
      ok: false,
      error: { kind: 'READ_ERROR', path: relativePath, message: errorMessage(e) },
    };
  }

  if (!isTextBuffer(buf)) {
    return { ok: false, error: { kind: 'NOT_TEXT', path: relativePath } };
  }

  return {
    ok: true,
    file: { path: relativePath, content: buf.toString('utf8'), sizeBytes: stat.size },
  };
};
