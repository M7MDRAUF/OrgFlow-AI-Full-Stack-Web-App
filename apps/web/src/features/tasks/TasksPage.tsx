import { useMemo, useState, type JSX } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
  Textarea,
  type TableColumn,
} from '@orgflow/ui';
import type {
  ProjectResponseDto,
  TaskPriority,
  TaskResponseDto,
  TaskStatus,
} from '@orgflow/shared-types';
import { authStorage } from '../auth/storage.js';
import { useProjects } from '../projects/useProjects.js';
import { useUsers } from '../users/useUsers.js';
import {
  useCreateComment,
  useCreateTask,
  useDeleteTask,
  useTaskComments,
  useTasks,
  useUpdateTask,
  type ListTasksFilters,
} from './useTasks.js';

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

  const [statusFilter, setStatusFilter] = useState<'' | TaskStatus>('');
  const [priorityFilter, setPriorityFilter] = useState<'' | TaskPriority>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [mineOnly, setMineOnly] = useState(false);

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
                setProjectFilter(e.target.value);
              }}
            />
          </Field>
          <Field label="Status" htmlFor="task-status-filter">
            <Select
              id="task-status-filter"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as '' | TaskStatus);
              }}
            />
          </Field>
          <Field label="Priority" htmlFor="task-priority-filter">
            <Select
              id="task-priority-filter"
              options={priorityOptions}
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as '' | TaskPriority);
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
                  setMineOnly(e.target.checked);
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

interface TaskFormModalProps {
  task?: TaskResponseDto;
  projects: ProjectResponseDto[];
  users: { id: string; name: string }[];
  onClose: () => void;
}

function TaskFormModal(props: TaskFormModalProps): JSX.Element {
  const { task, projects, users, onClose } = props;
  const isEdit = task !== undefined;

  const [projectId, setProjectId] = useState<string>(task?.projectId ?? projects[0]?.id ?? '');
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assignedTo, setAssignedTo] = useState<string>(task?.assignedTo ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate !== undefined && task.dueDate !== null ? task.dueDate.slice(0, 10) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const submitting = createTask.isPending || updateTask.isPending;

  const selectedProject = projects.find((p) => p.id === projectId);
  const eligibleAssignees = useMemo(() => {
    if (!selectedProject) return [{ value: '', label: 'Unassigned' }];
    const memberSet = new Set(selectedProject.memberIds);
    return [
      { value: '', label: 'Unassigned' },
      ...users.filter((u) => memberSet.has(u.id)).map((u) => ({ value: u.id, label: u.name })),
    ];
  }, [selectedProject, users]);

  function toIsoOrNull(value: string): string | null {
    if (value === '') return null;
    return new Date(value).toISOString();
  }

  async function onSubmit(): Promise<void> {
    setError(null);
    try {
      if (isEdit) {
        const input: {
          title?: string;
          description?: string | null;
          assignedTo?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          dueDate?: string | null;
        } = {};
        if (title.trim() !== task.title) input.title = title.trim();
        const nextDesc = description.trim() === '' ? null : description.trim();
        if (nextDesc !== task.description) input.description = nextDesc;
        const nextAssign = assignedTo === '' ? null : assignedTo;
        if (nextAssign !== task.assignedTo) input.assignedTo = nextAssign;
        if (priority !== task.priority) input.priority = priority;
        if (status !== task.status) input.status = status;
        const nextDue = toIsoOrNull(dueDate);
        if (nextDue !== task.dueDate) input.dueDate = nextDue;
        if (Object.keys(input).length > 0) {
          await updateTask.mutateAsync({ id: task.id, input });
        }
      } else {
        if (projectId === '') {
          setError('Project is required');
          return;
        }
        await createTask.mutateAsync({
          projectId,
          title: title.trim(),
          ...(description.trim() !== '' ? { description: description.trim() } : {}),
          ...(assignedTo !== '' ? { assignedTo } : {}),
          priority,
          ...(dueDate !== '' ? { dueDate: new Date(dueDate).toISOString() } : {}),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${task.title}` : 'Create task'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void onSubmit();
            }}
            loading={submitting}
            disabled={title.trim() === '' || projectId === ''}
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Project" htmlFor="task-project">
            <Select
              id="task-project"
              options={projects.map((p) => ({ value: p.id, label: p.title }))}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setAssignedTo('');
              }}
              disabled={isEdit}
            />
          </Field>
          <Field label="Assignee" htmlFor="task-assignee">
            <Select
              id="task-assignee"
              options={eligibleAssignees}
              value={assignedTo}
              onChange={(e) => {
                setAssignedTo(e.target.value);
              }}
            />
          </Field>
        </div>
        <Field label="Title" htmlFor="task-title">
          <Input
            id="task-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </Field>
        <Field label="Description" htmlFor="task-description">
          <Textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Priority" htmlFor="task-priority">
            <Select
              id="task-priority"
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as TaskPriority);
              }}
            />
          </Field>
          {isEdit ? (
            <Field label="Status" htmlFor="task-status">
              <Select
                id="task-status"
                options={[
                  { value: 'todo', label: 'To do' },
                  { value: 'in-progress', label: 'In progress' },
                  { value: 'done', label: 'Done' },
                ]}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as TaskStatus);
                }}
              />
            </Field>
          ) : null}
          <Field label="Due date" htmlFor="task-due">
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
              }}
            />
          </Field>
        </div>
        {error !== null ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </Modal>
  );
}

interface TaskDetailModalProps {
  task: TaskResponseDto;
  projects: ProjectResponseDto[];
  users: { id: string; name: string }[];
  onClose: () => void;
  onEdit: () => void;
}

function TaskDetailModal(props: TaskDetailModalProps): JSX.Element {
  const { task, projects, users, onClose, onEdit } = props;
  const profile = authStorage.getProfile();
  const canEdit =
    profile?.role === 'admin' ||
    (profile?.role === 'leader' && profile.teamId === task.teamId) ||
    task.assignedTo === (profile?.userId ?? null);
  const canDelete = profile?.role === 'admin' || profile?.role === 'leader';

  const commentsQuery = useTaskComments(task.id);
  const createComment = useCreateComment();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const project = projects.find((p) => p.id === task.projectId);
  const userById = new Map(users.map((u) => [u.id, u.name] as const));

  async function onSend(): Promise<void> {
    setError(null);
    const trimmed = body.trim();
    if (trimmed === '') return;
    try {
      await createComment.mutateAsync({ taskId: task.id, body: trimmed });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    }
  }

  async function quickStatus(next: TaskStatus): Promise<void> {
    setError(null);
    try {
      await updateTask.mutateAsync({ id: task.id, input: { status: next } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function onDelete(): Promise<void> {
    setError(null);
    try {
      await deleteTask.mutateAsync(task.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={task.title}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {canEdit ? (
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="danger"
              onClick={() => {
                void onDelete();
              }}
              loading={deleteTask.isPending}
            >
              Delete
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <span className="text-slate-500">Project:</span> {project?.title ?? task.projectId}
          </div>
          <div>
            <span className="text-slate-500">Assignee:</span>{' '}
            {task.assignedTo !== null ? (userById.get(task.assignedTo) ?? task.assignedTo) : '—'}
          </div>
          <div>
            <span className="text-slate-500">Priority:</span>{' '}
            <Badge tone={priorityTone[task.priority]}>{task.priority}</Badge>
          </div>
          <div>
            <span className="text-slate-500">Status:</span>{' '}
            <Badge tone={statusTone[task.status]}>{task.status}</Badge>
          </div>
          <div>
            <span className="text-slate-500">Due:</span>{' '}
            <span className={task.overdue ? 'font-medium text-rose-600' : ''}>
              {formatDate(task.dueDate)}
              {task.overdue ? ' • overdue' : ''}
            </span>
          </div>
        </div>
        {task.description !== null && task.description !== '' ? (
          <p className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-900/40">
            {task.description}
          </p>
        ) : null}
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {(['todo', 'in-progress', 'done'] as TaskStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={task.status === s ? 'primary' : 'secondary'}
                onClick={() => {
                  void quickStatus(s);
                }}
                disabled={updateTask.isPending || task.status === s}
              >
                {s}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Comments</h3>
          {commentsQuery.isLoading ? (
            <Skeleton className="h-16" />
          ) : (commentsQuery.data ?? []).length === 0 ? (
            <p className="text-xs text-slate-500">No comments yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(commentsQuery.data ?? []).map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-700"
                >
                  <div className="mb-1 text-xs text-slate-500">
                    {userById.get(c.userId) ?? c.userId} • {new Date(c.createdAt).toLocaleString()}
                  </div>
                  <div>{c.body}</div>
                </li>
              ))}
            </ul>
          )}
          <Textarea
            rows={2}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
            }}
            placeholder="Write a comment..."
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                void onSend();
              }}
              disabled={body.trim() === ''}
              loading={createComment.isPending}
            >
              Send
            </Button>
          </div>
        </div>
        {error !== null ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
