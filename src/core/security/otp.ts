import { randomInt, timingSafeEqual } from 'crypto';
import { Otp } from './types';

export const generateOtp = (): Otp => String(randomInt(100000, 1_000_000));

export const otpMatches = (provided: string, expected: string): boolean => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};
