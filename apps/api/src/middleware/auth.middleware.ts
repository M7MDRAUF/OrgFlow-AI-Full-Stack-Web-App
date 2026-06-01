// JWT verification middleware. Extracts Bearer token, verifies, attaches req.auth.
// auth-agent will add the login/logout endpoints; this middleware is platform
// infrastructure (AGENTS.md §4.3).
import { USER_ROLES, type UserRole, type UserStatus } from '@orgflow/shared-types';
import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import { loadEnv } from '../app/env.js';
import { UserModel } from '../modules/users/user.model.js';
import { errors } from '../utils/errors.js';
import type { AuthContext } from './auth-context.js';

// BUG-HIGH-1/HIGH-2: In-process TTL cache for per-user status+role lookups.
// After JWT verification we re-read the authoritative values from DB (max 60 s
// staleness), so a disabled user is denied within one cache window and a
// demoted user's old role stops being honoured within the same window.
const AUTH_CACHE_TTL_MS = 60_000;
interface CachedUserCtx {
  status: UserStatus;
  role: UserRole;
  expiresAt: number;
}
const userCtxCache = new Map<string, CachedUserCtx>();

async function getFreshUserCtx(userId: string): Promise<{ status: UserStatus; role: UserRole }> {
  const now = Date.now();
  const cached = userCtxCache.get(userId);
  if (cached !== undefined && cached.expiresAt > now) {
    return { status: cached.status, role: cached.role };
  }
  const user = await UserModel.findById(userId, { status: 1, role: 1 }).lean();
  if (user === null) throw errors.unauthenticated('Account not found');
  userCtxCache.set(userId, {
    status: user.status,
    role: user.role,
    expiresAt: now + AUTH_CACHE_TTL_MS,
  });
  return { status: user.status, role: user.role };
}

const tokenPayloadSchema = z.object({
  sub: z.string().min(1),
  organizationId: z.string().min(1),
  teamId: z.string().nullable(),
  role: z.enum(USER_ROLES),
});

export type AuthTokenPayload = z.infer<typeof tokenPayloadSchema>;

// SEC-01: HS256 is the only algorithm we ever sign with. Pinning the verifier
// to the same set defends against alg-confusion attacks (e.g. `alg: none`,
// or RSA-public-as-HMAC-secret historical jsonwebtoken bugs). Any token whose
// header advertises a different algorithm is rejected before any signature
// check runs, keeping the trust boundary minimal and explicit.
const JWT_ALGORITHMS: readonly jwt.Algorithm[] = ['HS256'] as const;

export function signAuthToken(payload: AuthTokenPayload): string {
  const env = loadEnv();
  // BE-03 / TYPE-01: use the proper jwt typing for `expiresIn` instead of an
  // unsafe `as unknown as` cast. The Zod-validated env value is a duration
  // string like "7d" / "30m" which jsonwebtoken's `StringValue` accepts.
  type ExpiresIn = NonNullable<jwt.SignOptions['expiresIn']>;
  const expiresIn = env.JWT_EXPIRES_IN as ExpiresIn;
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const env = loadEnv();
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [...JWT_ALGORITHMS] });
  } catch {
    throw errors.unauthenticated('Invalid or expired token');
  }
  const parsed = tokenPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw errors.unauthenticated('Malformed token payload');
  }
  return parsed.data;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (header?.toLowerCase().startsWith('bearer ') !== true) {
    next(errors.unauthenticated());
    return;
  }
  const token = header.slice('bearer '.length).trim();
  void (async (): Promise<void> => {
    try {
      const payload = verifyAuthToken(token);
      // BUG-HIGH-1: check user.status from DB (not JWT) so disabled accounts
      // are denied even while their token remains valid.
      // BUG-HIGH-2: use role from DB (not JWT) so demoted users lose elevated
      // access within AUTH_CACHE_TTL_MS (60 s) of the role change.
      const { status, role } = await getFreshUserCtx(payload.sub);
      if (status !== 'active') {
        next(errors.unauthenticated('Account is not active'));
        return;
      }
      const context: AuthContext = {
        userId: payload.sub,
        organizationId: payload.organizationId,
        teamId: payload.teamId,
        role,
      };
      req.auth = context;
      next();
    } catch (err) {
      next(err);
    }
  })();
}
