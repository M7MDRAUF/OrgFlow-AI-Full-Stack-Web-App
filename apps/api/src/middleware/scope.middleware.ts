// Scope helpers — build Mongo filter objects based on auth context + role.
// Centralizes the permission-aware query rules from the spec §3.8 so no module
// accidentally forgets to scope. RBAC enforcement lives in services, not
// frontend, and uses these helpers.
import type { FilterQuery } from 'mongoose';
import type { AuthContext } from './auth-context.js';

export interface ScopeOptions {
  teamId?: string | null;
  projectId?: string | null;
}

/**
 * Produces a Mongo filter that restricts results to the caller's authorized scope.
 * - admin: organization only
 * - leader: organization + (their team OR explicit teamId within their team)
 * - member: organization + (their team) + caller's userId when applicable
 */
export function scopeOrganizationFilter(auth: AuthContext): FilterQuery<Record<string, unknown>> {
  return { organizationId: auth.organizationId };
}

export function scopeTeamFilter(
  auth: AuthContext,
  opts: ScopeOptions = {},
): FilterQuery<Record<string, unknown>> {
  const base: Record<string, unknown> = { organizationId: auth.organizationId };
  if (auth.role === 'admin') {
    if (opts.teamId !== undefined && opts.teamId !== null) base['teamId'] = opts.teamId;
    return base;
  }
  if (auth.role === 'leader') {
    // Leader limited to their own team regardless of requested teamId.
    if (auth.teamId === null) return { ...base, teamId: { $in: [] } };
    base['teamId'] = auth.teamId;
    return base;
  }
  // member — their own team only
  if (auth.teamId === null) return { ...base, teamId: { $in: [] } };
  base['teamId'] = auth.teamId;
  return base;
}

export function scopeAssigneeFilter(auth: AuthContext): FilterQuery<Record<string, unknown>> {
  const base = scopeTeamFilter(auth);
  if (auth.role === 'member') {
    base['assignedTo'] = auth.userId;
  }
  return base;
}
