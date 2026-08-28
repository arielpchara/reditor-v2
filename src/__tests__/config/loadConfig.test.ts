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

  it('enables TLS by default', () => {
    delete process.env.USE_TLS;
    expect(loadConfig().useTls).toBe(true);
  });

  it('honors USE_TLS=false independently of securityEnabled', () => {
    process.env.USE_TLS = 'false';
    const cfg = loadConfig({ securityEnabled: true });
    expect(cfg.securityEnabled).toBe(true);
    expect(cfg.useTls).toBe(false);
  });

  it('allows an explicit useTls override', () => {
    process.env.USE_TLS = 'false';
    expect(loadConfig({ useTls: true }).useTls).toBe(true);
  });

  it('does not disable TLS when security is disabled', () => {
    delete process.env.USE_TLS;
    const cfg = loadConfig({ securityEnabled: false });
    expect(cfg.securityEnabled).toBe(false);
    expect(cfg.useTls).toBe(true);
  });
});
