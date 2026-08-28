import fs from 'fs';
import os from 'os';
import path from 'path';
import { readFile } from '../../../adapters/files/reader';
import { MAX_FILE_SIZE_BYTES } from '../../../core/files';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const write = (name: string, content: Buffer | string) =>
  fs.writeFileSync(path.join(tmpDir, name), content);

describe('readFile', () => {
  it('returns file content for a valid ASCII file', () => {
    write('hello.txt', 'hello world');
    const result = readFile(tmpDir, 'hello.txt');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.content).toBe('hello world');
  });

  it('returns file content for a valid UTF-8 file with multibyte chars', () => {
    write('utf8.txt', Buffer.from('héllo 🌍', 'utf8'));
    const result = readFile(tmpDir, 'utf8.txt');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.content).toBe('héllo 🌍');
  });

  it('returns NOT_FOUND for a missing file', () => {
    const result = readFile(tmpDir, 'missing.txt');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NOT_FOUND');
  });

  it('returns PATH_TRAVERSAL for .. escape', () => {
    const result = readFile(tmpDir, '../../etc/passwd');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('PATH_TRAVERSAL');
  });

  it('returns NOT_TEXT for a binary file with null bytes', () => {
    write('binary.bin', Buffer.from([65, 66, 0x00, 0x01]));
    const result = readFile(tmpDir, 'binary.bin');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NOT_TEXT');
  });

  it('returns TOO_LARGE for a file exceeding the size limit', () => {
    const bigContent = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1, 65); // 'A' * (limit+1)
    write('big.txt', bigContent);
    const result = readFile(tmpDir, 'big.txt');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('TOO_LARGE');
  });

  it('returns IS_DIRECTORY when path points to a directory', () => {
    fs.mkdirSync(path.join(tmpDir, 'subdir'));
    const result = readFile(tmpDir, 'subdir');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('IS_DIRECTORY');
  });

  it('includes sizeBytes in the successful result', () => {
    write('sized.txt', 'abc');
    const result = readFile(tmpDir, 'sized.txt');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.sizeBytes).toBe(3);
  });
});
