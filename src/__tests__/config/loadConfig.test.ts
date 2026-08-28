import { loadConfig } from '../../config';

describe('loadConfig', () => {
  const originalUseTls = process.env.USE_TLS;

  afterEach(() => {
    if (originalUseTls === undefined) {
      delete process.env.USE_TLS;
    } else {
      process.env.USE_TLS = originalUseTls;
    }
  });

  it('disables TLS by default', () => {
    delete process.env.USE_TLS;
    expect(loadConfig().useTls).toBe(false);
  });

  it('disables OTP by default', () => {
    expect(loadConfig().securityEnabled).toBe(false);
  });

  it('honors USE_TLS=true independently of securityEnabled', () => {
    process.env.USE_TLS = 'true';
    const cfg = loadConfig({ securityEnabled: true });
    expect(cfg.securityEnabled).toBe(true);
    expect(cfg.useTls).toBe(true);
  });

  it('allows an explicit useTls override', () => {
    delete process.env.USE_TLS;
    expect(loadConfig({ useTls: true }).useTls).toBe(true);
  });

  it('does not enable TLS when security is enabled', () => {
    delete process.env.USE_TLS;
    const cfg = loadConfig({ securityEnabled: true });
    expect(cfg.securityEnabled).toBe(true);
    expect(cfg.useTls).toBe(false);
  });
});
