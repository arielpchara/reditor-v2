import { waitUntilReady } from '../../../core/browser';

describe('waitUntilReady', () => {
  it('does not check when already stopped', async () => {
    const check = jest.fn();
    const delay = jest.fn();
    await expect(waitUntilReady(check, delay, 50, () => true)).resolves.toBe(false);
    expect(check).not.toHaveBeenCalled();
    expect(delay).not.toHaveBeenCalled();
  });

  it('returns true on the first successful check', async () => {
    const check = jest.fn().mockResolvedValue(true);
    const delay = jest.fn().mockResolvedValue(undefined);
    await expect(waitUntilReady(check, delay, 300, () => false)).resolves.toBe(true);
    expect(check).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it('retries until the check succeeds', async () => {
    const check = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const delay = jest.fn().mockResolvedValue(undefined);
    await expect(waitUntilReady(check, delay, 50, () => false)).resolves.toBe(true);
    expect(check).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(50);
  });

  it('returns false when stopped before a successful check', async () => {
    const check = jest.fn().mockResolvedValue(false);
    let stopped = false;
    const delay = jest.fn(async (): Promise<void> => {
      stopped = true;
    });
    await expect(waitUntilReady(check, delay, 50, () => stopped)).resolves.toBe(false);
    expect(check).toHaveBeenCalledTimes(1);
  });
});
