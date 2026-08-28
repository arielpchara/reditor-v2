import { describe, it, expect } from 'vitest';
import { isTunnelAccess } from '../serveStatus';

describe('isTunnelAccess', () => {
  it('is true when the page is loopback on a different port than serve', () => {
    expect(isTunnelAccess({ hostname: 'localhost', port: '8080', protocol: 'https:' }, 3000)).toBe(
      true,
    );
    expect(isTunnelAccess({ hostname: '127.0.0.1', port: '8080', protocol: 'https:' }, 3000)).toBe(
      true,
    );
  });

  it('is false when the page port matches the serve port', () => {
    expect(isTunnelAccess({ hostname: 'localhost', port: '3000', protocol: 'https:' }, 3000)).toBe(
      false,
    );
  });

  it('is false when the page is not loopback', () => {
    expect(
      isTunnelAccess({ hostname: '192.168.1.10', port: '8080', protocol: 'https:' }, 3000),
    ).toBe(false);
  });

  it('treats a missing port as 443 on https', () => {
    expect(isTunnelAccess({ hostname: 'localhost', port: '', protocol: 'https:' }, 3000)).toBe(
      true,
    );
    expect(isTunnelAccess({ hostname: 'localhost', port: '', protocol: 'https:' }, 443)).toBe(
      false,
    );
  });
});
