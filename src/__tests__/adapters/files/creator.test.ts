import fs from 'fs';
import os from 'os';
import path from 'path';
import { createFile } from '../../../adapters/files/creator';

describe('createFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-creator-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates an empty file', () => {
    const filePath = path.join(tmpDir, 'new.txt');
    const result = createFile(filePath);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('');
  });

  it('creates parent directories that do not exist', () => {
    const filePath = path.join(tmpDir, 'a', 'b', 'c', 'new.txt');
    const result = createFile(filePath);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('returns CREATE_ERROR when file already exists', () => {
    const filePath = path.join(tmpDir, 'existing.txt');
    fs.writeFileSync(filePath, 'existing content');
    const result = createFile(filePath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('CREATE_ERROR');
      expect(result.error.path).toBe(filePath);
    }
  });

  it('returns CREATE_ERROR for an invalid path', () => {
    const filePath = path.join(tmpDir, '\0invalid');
    const result = createFile(filePath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('CREATE_ERROR');
    }
  });
});
