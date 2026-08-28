import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../detectLanguage';

describe('detectLanguage', () => {
  it('maps common extensions', () => {
    expect(detectLanguage('app.ts')).toBe('typescript');
    expect(detectLanguage('App.tsx')).toBe('tsx');
    expect(detectLanguage('data.yml')).toBe('yaml');
  });

  it('returns plaintext for unknown or missing extensions', () => {
    expect(detectLanguage('README')).toBe('plaintext');
    expect(detectLanguage('file.xyz')).toBe('plaintext');
    expect(detectLanguage('.env')).toBe('plaintext');
  });
});
