import fs from 'fs';
import { FileWriteResult, MAX_FILE_SIZE_BYTES } from '../../core/files';

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const unlinkIfExists = (filePath: string): void => {
  try {
    fs.unlinkSync(filePath);
  } catch {
    return;
  }
};

export const writeFile = (absolutePath: string, content: string): FileWriteResult => {
  const sizeBytes = Buffer.byteLength(content, 'utf8');

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: { kind: 'TOO_LARGE', path: absolutePath, sizeBytes, maxBytes: MAX_FILE_SIZE_BYTES },
    };
  }

  const tmpPath = `${absolutePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmpPath, content, 'utf8');
    try {
      fs.renameSync(tmpPath, absolutePath);
    } catch {
      fs.copyFileSync(tmpPath, absolutePath);
      unlinkIfExists(tmpPath);
    }
    return { ok: true };
  } catch (e) {
    unlinkIfExists(tmpPath);
    return {
      ok: false,
      error: { kind: 'WRITE_ERROR', path: absolutePath, message: errorMessage(e) },
    };
  }
};
