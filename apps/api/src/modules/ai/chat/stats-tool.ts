// rag-chat-agent — Live workspace stats tool injected into the chat prompt
// for count/list-style questions. Reuses dashboard.service.getDashboard so the
// same RBAC scope (admin org-wide, leader team-scoped, member self-assigned)
// applies to both the dashboard UI and the assistant. NO new query path: this
// is a thin presenter over an already-scoped DTO.
import type { AiSourceCitation } from '@orgflow/shared-types';
import type { AuthContext } from '../../../middleware/auth-context.js';
import { getDashboard } from '../../dashboard/dashboard.service.js';

export interface StatsBlock {
  text: string;
  citation: AiSourceCitation;
}

// Stats-style questions: a verb phrase like "how many / number of / count of /
// total / list / show" combined with a workspace entity keyword. The intent
// gate is intentionally narrow so we only pay the dashboard cost when the LLM
// is likely to need a numeric answer.
const INTENT_VERB_REGEX =
  /\b(how many|number of|count of|total(\s+(number|count))?|list(\s+(of|the))?|show(\s+me)?(\s+the)?(\s+all)?)\b/i;
const ENTITY_REGEX =
  /\b(user|users|member|members|people|team|teams|project|projects|task|tasks|overdue|todo|in[- ]progress|done)\b/i;

export function detectStatsIntent(question: string): boolean {
  return INTENT_VERB_REGEX.test(question) && ENTITY_REGEX.test(question);
}

export async function buildStatsBlock(auth: AuthContext): Promise<StatsBlock> {
  const dash = await getDashboard(auth);
  const lines: string[] = [];
  if (dash.scope === 'admin') {
    const s = dash.stats;
    lines.push('Scope: admin (organization-wide).');
    lines.push(`Teams: ${String(s.teams)}`);
    lines.push(`Users (team users in this organization): ${String(s.users)}`);
    lines.push(`Projects: ${String(s.projects)}`);
    lines.push(`Tasks total: ${String(s.tasks)}`);
    lines.push(`Tasks todo: ${String(s.tasksTodo)}`);
    lines.push(`Tasks in progress: ${String(s.tasksInProgress)}`);
    lines.push(`Tasks done: ${String(s.tasksDone)}`);
    lines.push(`Tasks overdue: ${String(s.tasksOverdue)}`);
    if (dash.byTeam.length > 0) {
      lines.push('Teams breakdown:');
      for (const t of dash.byTeam) {
        lines.push(
          `- ${t.teamName}: ${String(t.projectCount)} projects, ${String(t.taskCount)} tasks (${String(t.overdueCount)} overdue)`,
        );
      }
    }
  } else if (dash.scope === 'leader') {
    const s = dash.stats;
    lines.push(`Scope: leader (team ${dash.teamId}).`);
    lines.push(`Team users (members of this team): ${String(s.users)}`);
    lines.push(`Projects in this team: ${String(s.projects)}`);
    lines.push(`Tasks total: ${String(s.tasks)}`);
    lines.push(`Tasks todo: ${String(s.tasksTodo)}`);
    lines.push(`Tasks in progress: ${String(s.tasksInProgress)}`);
    lines.push(`Tasks done: ${String(s.tasksDone)}`);
    lines.push(`Tasks overdue: ${String(s.tasksOverdue)}`);
  } else {
    const s = dash.stats;
    lines.push('Scope: member (only your assigned tasks are visible here).');
    lines.push(`My assigned tasks total: ${String(s.assignedTotal)}`);
    lines.push(`My assigned todo: ${String(s.assignedTodo)}`);
    lines.push(`My assigned in progress: ${String(s.assignedInProgress)}`);
    lines.push(`My assigned done: ${String(s.assignedDone)}`);
    lines.push(`My assigned overdue: ${String(s.assignedOverdue)}`);
  }
  return {
    text: lines.join('\n'),
    citation: {
      documentId: 'live-stats',
      title: `Live workspace stats (${dash.scope})`,
      chunkIndex: 0,
    },
  };
}
