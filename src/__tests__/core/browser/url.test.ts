import { buildEditorUrl, buildHealthUrl } from '../../../core/browser';

describe('buildEditorUrl', () => {
  it('builds the local HTTP editor URL by default path', () => {
    expect(buildEditorUrl(8080, false)).toBe('http://localhost:8080');
  });

  it('builds the local HTTPS editor URL when TLS is on', () => {
    expect(buildEditorUrl(8080, true)).toBe('https://localhost:8080');
  });
});

describe('buildHealthUrl', () => {
  it('builds the loopback HTTP health URL', () => {
    expect(buildHealthUrl(8080, false)).toBe('http://127.0.0.1:8080/health');
  });

  it('builds the loopback HTTPS health URL when TLS is on', () => {
    expect(buildHealthUrl(8080, true)).toBe('https://127.0.0.1:8080/health');
  });
});
