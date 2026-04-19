import { type TaskPriority, type TaskResponseDto, type TaskStatus } from '@orgflow/shared-types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Select,
  Skeleton,
  Table,
  type TableColumn,
} from '@orgflow/ui';
import { useCallback, useMemo, useState, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authStorage } from '../auth/storage.js';
import { useProjects } from '../projects/useProjects.js';
import { useUsers } from '../users/useUsers.js';
import { TaskDetailModal } from './TaskDetailModal.js';
import { TaskFormModal } from './TaskFormModal.js';
import { useTasks, type ListTasksFilters } from './useTasks.js';

const statusOptions: { value: '' | TaskStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

const priorityOptions: { value: '' | TaskPriority; label: string }[] = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const statusTone: Record<TaskStatus, 'default' | 'info' | 'success'> = {
  todo: 'default',
  'in-progress': 'info',
  done: 'success',
};

const priorityTone: Record<TaskPriority, 'info' | 'warning' | 'danger'> = {
  low: 'info',
  medium: 'warning',
  high: 'danger',
};

function formatDate(iso: string | null): string {
  if (iso === null) return '—';
  return new Date(iso).toLocaleDateString();
}

export function TasksPage(): JSX.Element {
  const profile = authStorage.getProfile();
  const canCreate = profile?.role === 'admin' || profile?.role === 'leader';

  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = (searchParams.get('status') ?? '') as '' | TaskStatus;
  const priorityFilter = (searchParams.get('priority') ?? '') as '' | TaskPriority;
  const projectFilter = searchParams.get('project') ?? '';
  const mineOnly = searchParams.get('mine') === '1';

  const setFilter = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === '' || value === '0') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const projectsQuery = useProjects();
  const usersQuery = useUsers();

  const filters = useMemo<ListTasksFilters>(() => {
    const f: ListTasksFilters = {};
    if (statusFilter !== '') f.status = statusFilter;
    if (priorityFilter !== '') f.priority = priorityFilter;
    if (projectFilter !== '') f.projectId = projectFilter;
    if (mineOnly) f.mine = true;
    return f;
  }, [statusFilter, priorityFilter, projectFilter, mineOnly]);

  const tasksQuery = useTasks(filters);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaskResponseDto | null>(null);
  const [detail, setDetail] = useState<TaskResponseDto | null>(null);

  const projectNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projectsQuery.data ?? []) m.set(p.id, p.title);
    return m;
  }, [projectsQuery.data]);

  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersQuery.data ?? []) m.set(u.id, u.name);
    return m;
  }, [usersQuery.data]);

  const projectOptions = useMemo(
    () => [
      { value: '', label: 'All projects' },
      ...(projectsQuery.data ?? []).map((p) => ({ value: p.id, label: p.title })),
    ],
    [projectsQuery.data],
  );

  const columns = useMemo<TableColumn<TaskResponseDto>[]>(
    () => [
      {
        key: 'title',
        header: 'Title',
        render: (t) => (
          <button
            type="button"
            className="text-left text-brand-600 hover:underline"
            onClick={() => {
              setDetail(t);
            }}
          >
            {t.title}
          </button>
        ),
      },
      {
        key: 'project',
        header: 'Project',
        render: (t) => projectNameById.get(t.projectId) ?? '—',
      },
      {
        key: 'assignee',
        header: 'Assignee',
        render: (t) => (t.assignedTo !== null ? (userNameById.get(t.assignedTo) ?? '—') : '—'),
      },
      {
        key: 'priority',
        header: 'Priority',
        render: (t) => <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (t) => <Badge tone={statusTone[t.status]}>{t.status}</Badge>,
      },
      {
        key: 'due',
        header: 'Due',
        render: (t) => (
          <span className={t.overdue ? 'font-medium text-rose-600' : ''}>
            {formatDate(t.dueDate)}
            {t.overdue ? ' • overdue' : ''}
          </span>
        ),
      },
    ],
    [projectNameById, userNameById],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track work with project scope, assignees, priority, and due dates.
          </p>
        </div>
        {canCreate ? (
          <Button
            onClick={() => {
              setCreating(true);
            }}
          >
            New task
          </Button>
        ) : null}
      </header>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Project" htmlFor="task-project-filter">
            <Select
              id="task-project-filter"
              options={projectOptions}
              value={projectFilter}
              onChange={(e) => {
                setFilter('project', e.target.value);
              }}
            />
          </Field>
          <Field label="Status" htmlFor="task-status-filter">
            <Select
              id="task-status-filter"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setFilter('status', e.target.value);
              }}
            />
          </Field>
          <Field label="Priority" htmlFor="task-priority-filter">
            <Select
              id="task-priority-filter"
              options={priorityOptions}
              value={priorityFilter}
              onChange={(e) => {
                setFilter('priority', e.target.value);
              }}
            />
          </Field>
          <Field label="Scope" htmlFor="task-mine-filter">
            <label className="flex h-10 items-center gap-2 text-sm">
              <input
                id="task-mine-filter"
                type="checkbox"
                checked={mineOnly}
                onChange={(e) => {
                  setFilter('mine', e.target.checked ? '1' : '');
                }}
              />
              Only assigned to me
            </label>
          </Field>
        </div>
      </Card>

      {tasksQuery.isLoading ? (
        <Skeleton className="h-40" />
      ) : tasksQuery.isError ? (
        <ErrorState
          title="Failed to load tasks"
          description={tasksQuery.error.message}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void tasksQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      ) : (tasksQuery.data ?? []).length === 0 ? (
        <EmptyState title="No tasks" description="Create a task or adjust filters to see more." />
      ) : (
        <Table<TaskResponseDto>
          columns={columns}
          rows={tasksQuery.data ?? []}
          rowKey={(t) => t.id}
        />
      )}

      {creating ? (
        <TaskFormModal
          projects={projectsQuery.data ?? []}
          users={usersQuery.data ?? []}
          onClose={() => {
            setCreating(false);
          }}
        />
      ) : null}

      {editing !== null ? (
        <TaskFormModal
          task={editing}
          projects={projectsQuery.data ?? []}
          users={usersQuery.data ?? []}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}

      {detail !== null ? (
        <TaskDetailModal
          task={detail}
          projects={projectsQuery.data ?? []}
          users={usersQuery.data ?? []}
          onClose={() => {
            setDetail(null);
          }}
          onEdit={() => {
            setEditing(detail);
            setDetail(null);
          }}
        />
      ) : null}
    </div>
  );
}
