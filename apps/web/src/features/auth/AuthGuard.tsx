// Route guards. Pages that require authentication wrap their element in
// <AuthGuard>. Pages that require a minimum role add <RoleGuard>, which
// renders an explicit 403 view (FE-L-004) instead of silently bouncing to /.
import { hasAtLeastRole, type UserRole } from '@orgflow/shared-types';
import type { JSX, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ForbiddenPage } from '../../app/ForbiddenPage.js';
import { authStorage } from './storage.js';

export function AuthGuard(props: { children: ReactNode }): JSX.Element {
  const location = useLocation();
  const token = authStorage.getToken();
  if (token === null) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{props.children}</>;
}

export function RoleGuard(props: { minRole: UserRole; children: ReactNode }): JSX.Element {
  const profile = authStorage.getProfile();
  if (profile === null) {
    return <Navigate to="/login" replace />;
  }
  if (!hasAtLeastRole(profile.role, props.minRole)) {
    return <ForbiddenPage />;
  }
  return <>{props.children}</>;
}
