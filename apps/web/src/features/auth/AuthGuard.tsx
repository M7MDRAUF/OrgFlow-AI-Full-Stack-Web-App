// Route guards. Pages that require authentication wrap their element in
// <AuthGuard>. Pages that require a minimum role add <RoleGuard>, which
// renders an explicit 403 view (FE-L-004) instead of silently bouncing to /.
import { hasAtLeastRole, type UserRole } from '@orgflow/shared-types';
import type { JSX, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ForbiddenPage } from '../../app/ForbiddenPage.js';
import { authStorage } from './storage.js';

/**
 * BUG-MEDIUM-13: check both existence AND expiry of the stored JWT.
 * A stored-but-expired token must be treated as unauthenticated so the user
 * is redirected to /login rather than being allowed to load a protected page
 * that will immediately fail with 401.
 */
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const rawPart = parts[1];
    if (rawPart === undefined) return false;
    const payloadJson = atob(rawPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthGuard(props: { children: ReactNode }): JSX.Element {
  const location = useLocation();
  const token = authStorage.getToken();
  if (token === null || !isTokenValid(token)) {
    // Clear stale/expired token so login page renders cleanly.
    if (token !== null) authStorage.clear();
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{props.children}</>;
}

/**
 * BUG-LOW-2: read the role from the JWT payload instead of from the mutable
 * localStorage profile object. A user with DevTools access can trivially change
 * the stored profile role; reading it from the token makes elevation harder
 * (they'd also need a valid matching token). This is defense-in-depth — real
 * enforcement is always on the server.
 */
function getRoleFromToken(token: string): UserRole | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const rawPart = parts[1];
    if (rawPart === undefined) return null;
    const payloadJson = atob(rawPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { role?: unknown };
    if (typeof payload.role !== 'string') return null;
    const knownRoles: UserRole[] = ['admin', 'leader', 'member'];
    return knownRoles.includes(payload.role as UserRole) ? (payload.role as UserRole) : null;
  } catch {
    return null;
  }
}

export function RoleGuard(props: { minRole: UserRole; children: ReactNode }): JSX.Element {
  const token = authStorage.getToken();
  if (token === null) {
    return <Navigate to="/login" replace />;
  }
  const role = getRoleFromToken(token);
  if (role === null || !hasAtLeastRole(role, props.minRole)) {
    return <ForbiddenPage />;
  }
  return <>{props.children}</>;
}
