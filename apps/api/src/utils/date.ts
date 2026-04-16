// Overdue semantics — single source of truth for the rule in spec §3.14.
import type { TaskStatus } from '@orgflow/shared-types';

export function isOverdue(
  status: TaskStatus,
  dueDate: Date | string | null,
  now: Date = new Date(),
): boolean {
  if (status === 'done') return false;
  if (dueDate === null) return false;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return due.getTime() < now.getTime();
}
