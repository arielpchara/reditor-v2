import fs from 'fs';
import os from 'os';
import path from 'path';
import { readFileMeta } from '../../../adapters/files/meta';

describe('readFileMeta', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reditor-meta-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns size and hasShebang false for a plain file', () => {
    const filePath = path.join(tmpDir, 'a.txt');
    fs.writeFileSync(filePath, 'hello');
    expect(readFileMeta(filePath)).toEqual({ sizeBytes: 5, hasShebang: false });
  });

  it('detects a shebang', () => {
    const filePath = path.join(tmpDir, 'run.sh');
    fs.writeFileSync(filePath, '#!/bin/sh\necho hi\n');
    expect(readFileMeta(filePath).hasShebang).toBe(true);
  });

  it('returns zeros when the file is missing', () => {
    expect(readFileMeta(path.join(tmpDir, 'missing.txt'))).toEqual({
      sizeBytes: 0,
      hasShebang: false,
    });
  });
});
