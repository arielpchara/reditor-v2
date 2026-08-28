import { generateOtp, otpMatches } from '../../../core/security/otp';

describe('generateOtp', () => {
  it('returns a 6-digit numeric string', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('generates values within the valid range', () => {
    const otp = generateOtp();
    const n = Number(otp);
    expect(n).toBeGreaterThanOrEqual(100000);
    expect(n).toBeLessThanOrEqual(999999);
  });

  it('generates different values on successive calls', () => {
    const results = new Set(Array.from({ length: 20 }, generateOtp));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('otpMatches', () => {
  it('returns true for identical values', () => {
    expect(otpMatches('123456', '123456')).toBe(true);
  });

  it('returns false for different values of the same length', () => {
    expect(otpMatches('123456', '654321')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(otpMatches('123', '123456')).toBe(false);
  });
});
