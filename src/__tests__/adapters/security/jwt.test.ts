import { createToken, verifyToken, buildTokenResult } from '../../../adapters/security/jwt';
import { generateKeyPair } from '../../../adapters/security/keys';

describe('JWT — createToken', () => {
  let privateKey: string;
  let publicKey: string;

  beforeAll(() => {
    const kp = generateKeyPair();
    privateKey = kp.privateKey;
    publicKey = kp.publicKey;
  });

  it('returns a non-empty JWT string', () => {
    const token = createToken(privateKey, 300);
    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3);
  });

  it('produces a token verifiable with the matching public key', () => {
    const token = createToken(privateKey, 300);
    const result = verifyToken(token, publicKey);
    expect(result.ok).toBe(true);
  });

  it('embeds the expected sub claim', () => {
    const token = createToken(privateKey, 300);
    const result = verifyToken(token, publicKey);
    if (!result.ok) throw new Error('Unexpected verify failure');
    expect(result.token).toBe(token);
  });

  it('fails verification with a wrong public key', () => {
    const wrongKeys = generateKeyPair();
    const token = createToken(privateKey, 300);
    const result = verifyToken(token, wrongKeys.publicKey);
    expect(result.ok).toBe(false);
  });

  it('fails verification of an expired token', async () => {
    const token = createToken(privateKey, -1);
    const result = verifyToken(token, publicKey);
    expect(result.ok).toBe(false);
  });
});

describe('JWT — buildTokenResult', () => {
  let keyPair: ReturnType<typeof generateKeyPair>;

  beforeAll(() => {
    keyPair = generateKeyPair();
  });

  it('returns token and correct expiresIn', () => {
    const result = buildTokenResult(keyPair, 600);
    expect(result.token).toBeTruthy();
    expect(result.expiresIn).toBe(600);
  });
});
