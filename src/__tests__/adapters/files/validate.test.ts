import fs from 'fs';
import os from 'os';
import path from 'path';
import { validateFile } from '../../../adapters/files/validate';
import { MAX_FILE_SIZE_BYTES } from '../../../core/files';

describe('validateFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-validate-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const write = (name: string, content: Buffer | string): string => {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  it('returns ok:true for a valid text file', () => {
    const filePath = write('hello.txt', 'hello world');
    expect(validateFile(filePath)).toEqual({ ok: true });
  });

  it('returns NOT_FOUND for a missing file', () => {
    const result = validateFile(path.join(tmpDir, 'missing.txt'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NOT_FOUND');
  });

  it('returns IS_DIRECTORY when path points to a directory', () => {
    const result = validateFile(tmpDir);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('IS_DIRECTORY');
  });

  it('returns TOO_LARGE for a file exceeding the size limit', () => {
    const filePath = write('big.txt', Buffer.alloc(MAX_FILE_SIZE_BYTES + 1, 65));
    const result = validateFile(filePath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('TOO_LARGE');
      if (result.error.kind === 'TOO_LARGE') {
        expect(result.error.sizeBytes).toBe(MAX_FILE_SIZE_BYTES + 1);
        expect(result.error.maxBytes).toBe(MAX_FILE_SIZE_BYTES);
      }
    }
  });

  it('returns NOT_TEXT for a binary file with null bytes', () => {
    const filePath = write('binary.bin', Buffer.from([65, 66, 0x00, 0x01]));
    const result = validateFile(filePath);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NOT_TEXT');
  });

  it('returns ok:true for a valid UTF-8 file with multibyte chars', () => {
    const filePath = write('utf8.txt', Buffer.from('héllo 🌍', 'utf8'));
    expect(validateFile(filePath)).toEqual({ ok: true });
  });
});
