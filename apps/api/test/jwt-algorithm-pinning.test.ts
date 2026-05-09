// SEC-01 regression — JWT verification must reject any algorithm other than
// HS256, even if a forged token's header advertises e.g. `alg: none`.
import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { signAuthToken, verifyAuthToken } from '../src/middleware/auth.middleware.js';

describe('SEC-01: JWT algorithm pinning', () => {
  it('round-trips an HS256-signed token', () => {
    const payload = {
      sub: '507f1f77bcf86cd799439011',
      organizationId: '507f1f77bcf86cd799439012',
      teamId: null,
      role: 'admin' as const,
    };
    const token = signAuthToken(payload);
    const decoded = verifyAuthToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it('rejects an `alg: none` token even when the payload is well-formed', () => {
    // jsonwebtoken@9 refuses to sign with `alg: none` directly, so we hand-
    // craft the token: base64url(header).base64url(payload). with empty sig.
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        sub: '507f1f77bcf86cd799439011',
        organizationId: '507f1f77bcf86cd799439012',
        teamId: null,
        role: 'admin',
      }),
    ).toString('base64url');
    const forged = `${header}.${body}.`;
    expect(() => verifyAuthToken(forged)).toThrowError(/Invalid or expired token/);
  });

  it('rejects tokens signed with the wrong algorithm even when the secret is known', () => {
    // Forge an HS512 token using the same secret. Without algorithm pinning,
    // jsonwebtoken would happily verify it; with pinning it must reject.
    const secret = process.env['JWT_SECRET'] ?? '';
    expect(secret.length).toBeGreaterThanOrEqual(32);
    const forged = jwt.sign(
      {
        sub: '507f1f77bcf86cd799439011',
        organizationId: '507f1f77bcf86cd799439012',
        teamId: null,
        role: 'admin',
      },
      secret,
      { algorithm: 'HS512' },
    );
    expect(() => verifyAuthToken(forged)).toThrowError(/Invalid or expired token/);
  });
});
