import fs from 'fs';
import path from 'path';
import { FileCreateResult } from '../../core/files';

export const createFile = (filePath: string): FileCreateResult => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '', { flag: 'wx' });
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { kind: 'CREATE_ERROR', path: filePath, message } };
  }
};
