import fs from 'fs';
import {
  FileValidationResult,
  MAX_FILE_SIZE_BYTES,
  isTextBuffer,
  isWithinSizeLimit,
} from '../../core/files';

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const validateFile = (absolutePath: string): FileValidationResult => {
  if (!fs.existsSync(absolutePath)) {
    return { ok: false, error: { kind: 'NOT_FOUND', path: absolutePath } };
  }

  const stat = fs.statSync(absolutePath);

  if (stat.isDirectory()) {
    return { ok: false, error: { kind: 'IS_DIRECTORY', path: absolutePath } };
  }

  if (!isWithinSizeLimit(stat.size)) {
    return {
      ok: false,
      error: {
        kind: 'TOO_LARGE',
        path: absolutePath,
        sizeBytes: stat.size,
        maxBytes: MAX_FILE_SIZE_BYTES,
      },
    };
  }

  let buf: Buffer;
  try {
    buf = fs.readFileSync(absolutePath);
  } catch (e) {
    return {
      ok: false,
      error: { kind: 'READ_ERROR', path: absolutePath, message: errorMessage(e) },
    };
  }

  if (!isTextBuffer(buf)) {
    return { ok: false, error: { kind: 'NOT_TEXT', path: absolutePath } };
  }

  return { ok: true };
};
