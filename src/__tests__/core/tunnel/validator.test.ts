import { isValidPort, isValidTarget } from '../../../core/tunnel/validator';

describe('isValidPort', () => {
  it('accepts 1', () => {
    expect(isValidPort(1)).toBe(true);
  });

  it('accepts 65535', () => {
    expect(isValidPort(65535)).toBe(true);
  });

  it('accepts 8080', () => {
    expect(isValidPort(8080)).toBe(true);
  });

  it('rejects 0', () => {
    expect(isValidPort(0)).toBe(false);
  });

  it('rejects 65536', () => {
    expect(isValidPort(65536)).toBe(false);
  });

  it('rejects a float', () => {
    expect(isValidPort(8080.5)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidPort(Number.NaN)).toBe(false);
  });
});

describe('isValidTarget', () => {
  it('accepts user@host', () => {
    expect(isValidTarget('user@host')).toBe(true);
  });

  it('accepts an SSH config alias', () => {
    expect(isValidTarget('prod')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidTarget('')).toBe(false);
  });

  it('rejects whitespace only', () => {
    expect(isValidTarget('   ')).toBe(false);
  });

  it('rejects a value that looks like a flag', () => {
    expect(isValidTarget('--port')).toBe(false);
  });
});
