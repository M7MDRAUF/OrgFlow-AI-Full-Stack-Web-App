// Role guard — requires the authenticated user to be at least the given role.
// (AGENTS.md §3.3 security, §4.3 platform).
import type { NextFunction, Request, Response } from 'express';
import { hasAtLeastRole, type UserRole } from '@orgflow/shared-types';
import { errors } from '../utils/errors.js';

export function requireRole(minRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (auth === undefined) {
      next(errors.unauthenticated());
      return;
    }
    if (!hasAtLeastRole(auth.role, minRole)) {
      next(errors.forbidden(`Requires role >= ${minRole}`));
      return;
    }
    next();
  };
}
