import { isTextBuffer, isWithinRoot, isWithinSizeLimit } from '../../../core/files/validator';
import { MAX_FILE_SIZE_BYTES } from '../../../core/files/types';

describe('isTextBuffer', () => {
  it('returns true for a pure ASCII buffer', () => {
    expect(isTextBuffer(Buffer.from('hello world\n'))).toBe(true);
  });

  it('returns true for an empty buffer', () => {
    expect(isTextBuffer(Buffer.alloc(0))).toBe(true);
  });

  it('returns true for a valid UTF-8 buffer with multibyte chars', () => {
    expect(isTextBuffer(Buffer.from('héllo', 'utf8'))).toBe(true);
  });

  it('returns true for a UTF-8 buffer with emoji', () => {
    expect(isTextBuffer(Buffer.from('hello 🌍', 'utf8'))).toBe(true);
  });

  it('returns false when the buffer contains a null byte', () => {
    expect(isTextBuffer(Buffer.from([72, 101, 0x00, 108, 111]))).toBe(false);
  });

  it('returns false for invalid UTF-8 bytes', () => {
    expect(isTextBuffer(Buffer.from([0xff, 0xfe, 0x00, 0x01]))).toBe(false);
  });
});

describe('isWithinRoot', () => {
  const root = '/srv/files';

  it('allows a path directly inside root', () => {
    expect(isWithinRoot(root, '/srv/files/readme.txt')).toBe(true);
  });

  it('allows a deeply nested path inside root', () => {
    expect(isWithinRoot(root, '/srv/files/a/b/c.ts')).toBe(true);
  });

  it('allows the root path itself', () => {
    expect(isWithinRoot(root, '/srv/files')).toBe(true);
  });

  it('rejects a sibling prefix path', () => {
    expect(isWithinRoot(root, '/srv/files-evil/secret')).toBe(false);
  });

  it('rejects a path that escapes via ..', () => {
    expect(isWithinRoot(root, '/srv/files/../../etc/passwd')).toBe(false);
  });

  it('rejects a path completely outside root', () => {
    expect(isWithinRoot(root, '/etc/passwd')).toBe(false);
  });
});

describe('isWithinSizeLimit', () => {
  it('allows a file exactly at the limit', () => {
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES)).toBe(true);
  });

  it('allows a file smaller than the limit', () => {
    expect(isWithinSizeLimit(1024)).toBe(true);
  });

  it('rejects a file one byte over the limit', () => {
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES + 1)).toBe(false);
  });

  it('accepts a custom max', () => {
    expect(isWithinSizeLimit(100, 50)).toBe(false);
    expect(isWithinSizeLimit(50, 50)).toBe(true);
  });
});
