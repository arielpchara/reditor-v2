import fs from 'fs';
import { FileMetaInfo } from '../../core/files';

const detectShebang = (filepath: string): boolean => {
  try {
    const fd = fs.openSync(filepath, 'r');
    const buf = Buffer.alloc(2);
    const bytesRead = fs.readSync(fd, buf, 0, 2, 0);
    fs.closeSync(fd);
    return bytesRead === 2 && buf[0] === 0x23 && buf[1] === 0x21;
  } catch {
    return false;
  }
};

export const readFileMeta = (absolutePath: string): FileMetaInfo => {
  try {
    const sizeBytes = fs.statSync(absolutePath).size;
    return { sizeBytes, hasShebang: detectShebang(absolutePath) };
  } catch {
    return { sizeBytes: 0, hasShebang: false };
  }
};
