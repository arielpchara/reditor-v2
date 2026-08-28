import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeFile } from '../../../adapters/files/writer';
import { MAX_FILE_SIZE_BYTES } from '../../../core/files';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-write-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('writeFile', () => {
  it('writes content to a file and returns ok:true', () => {
    const filePath = path.join(tmpDir, 'out.txt');
    const result = writeFile(filePath, 'hello world');
    expect(result.ok).toBe(true);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('hello world');
  });

  it('overwrites existing file content', () => {
    const filePath = path.join(tmpDir, 'out.txt');
    fs.writeFileSync(filePath, 'old content');
    writeFile(filePath, 'new content');
    expect(fs.readFileSync(filePath, 'utf8')).toBe('new content');
  });

  it('does not leave a tmp file after a successful write', () => {
    const filePath = path.join(tmpDir, 'out.txt');
    writeFile(filePath, 'hello');
    const leftovers = fs.readdirSync(tmpDir).filter((name) => name.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('returns TOO_LARGE when content exceeds the size limit', () => {
    const filePath = path.join(tmpDir, 'big.txt');
    const bigContent = 'A'.repeat(MAX_FILE_SIZE_BYTES + 1);
    const result = writeFile(filePath, bigContent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('TOO_LARGE');
      expect(fs.existsSync(filePath)).toBe(false);
    }
  });

  it('returns WRITE_ERROR when path is not writable', () => {
    const result = writeFile('/not/a/real/path/out.txt', 'content');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('WRITE_ERROR');
  });
});
