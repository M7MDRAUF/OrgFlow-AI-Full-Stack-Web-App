import type {
  ProjectResponseDto,
  TaskPriority,
  TaskResponseDto,
  TaskStatus,
} from '@orgflow/shared-types';
import { Badge, Button, Modal, Skeleton, Textarea } from '@orgflow/ui';
import { useMemo, useState, type JSX } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { authStorage } from '../auth/storage.js';
import { useCreateComment, useDeleteTask, useTaskComments, useUpdateTask } from './useTasks.js';

const priorityTone: Record<TaskPriority, 'info' | 'warning' | 'danger'> = {
  low: 'info',
  medium: 'warning',
  high: 'danger',
};

const statusTone: Record<TaskStatus, 'default' | 'info' | 'success'> = {
  todo: 'default',
  'in-progress': 'info',
  done: 'success',
};

function formatDate(iso: string | null): string {
  if (iso === null) return '—';
  return new Date(iso).toLocaleDateString();
}

export interface TaskDetailModalProps {
  task: TaskResponseDto;
  projects: ProjectResponseDto[];
  users: { id: string; name: string }[];
  onClose: () => void;
  onEdit: () => void;
}

export function TaskDetailModal(props: TaskDetailModalProps): JSX.Element {
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = projects.find((p) => p.id === task.projectId);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u.name] as const)), [users]);

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
                setConfirmDelete(true);
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
          <label htmlFor="task-comment" className="sr-only">
            Add a comment
          </label>
          <Textarea
            id="task-comment"
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
        {error !== null ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmDelete(false);
          void onDelete();
        }}
        onCancel={() => {
          setConfirmDelete(false);
        }}
      />
    </Modal>
  );
}
