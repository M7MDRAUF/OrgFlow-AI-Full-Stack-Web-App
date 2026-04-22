// platform-agent — F6 audit logger.
// Structured sensitive-mutation logs. Intentionally minimal: a pino child
// logger with a stable `event: 'audit'` key + payload shape so ops can filter
// and alert on these events without grepping free-text. Never emits raw PII or
// body content; only identifiers + verb + resource.
import type { Logger } from 'pino';
import { loadEnv } from '../app/env.js';
import { getLogger } from '../config/logger.js';
import type { AuthContext } from '../middleware/auth-context.js';

interface AuditEvent {
  action:
    | 'auth.login'
    | 'auth.login.failed'
    | 'auth.logout'
    | 'user.role.change'
    | 'user.team.change'
    | 'user.status.change'
    | 'user.invite'
    | 'team.create'
    | 'team.update'
    | 'team.delete'
    | 'project.create'
    | 'project.update'
    | 'project.delete'
    | 'task.create'
    | 'task.update'
    | 'task.delete'
    | 'announcement.create'
    | 'announcement.update'
    | 'announcement.delete'
    | 'document.upload'
    | 'document.delete'
    | 'document.reindex'
    | 'organization.update'
    | 'chat.ask'
    | 'chat.clear';
  resourceId: string | null;
  // Small metadata bag (before/after values, ids). Caller is responsible for
  // not putting sensitive data in here; the logger's redact paths still apply.
  meta?: Record<string, unknown>;
}

let cachedChild: Logger | null = null;

function auditLogger(): Logger {
  if (cachedChild !== null) return cachedChild;
  cachedChild = getLogger(loadEnv()).child({ component: 'audit' });
  return cachedChild;
}

export function logAudit(actor: AuthContext, event: AuditEvent): void {
  auditLogger().info(
    {
      event: 'audit',
      action: event.action,
      actorUserId: actor.userId,
      actorRole: actor.role,
      actorOrgId: actor.organizationId,
      actorTeamId: actor.teamId,
      resourceId: event.resourceId,
      meta: event.meta ?? {},
    },
    event.action,
  );
}
