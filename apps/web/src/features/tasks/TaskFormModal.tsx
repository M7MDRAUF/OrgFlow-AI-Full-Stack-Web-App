import {
  TASK_PRIORITIES,
  type ProjectResponseDto,
  type TaskPriority,
  type TaskResponseDto,
  type TaskStatus,
} from '@orgflow/shared-types';
import { Button, Field, Input, Modal, Select, Textarea } from '@orgflow/ui';
import { useMemo, useState, type FormEvent, type JSX } from 'react';
import { z } from 'zod';
import { useCreateTask, useUpdateTask } from './useTasks.js';

const taskFormSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  description: z.string().max(5000, 'Description must be 5 000 characters or fewer').optional(),
  priority: z.enum(TASK_PRIORITIES),
});

type TaskFormErrors = Partial<Record<keyof z.infer<typeof taskFormSchema>, string>>;

export interface TaskFormModalProps {
  task?: TaskResponseDto;
  projects: ProjectResponseDto[];
  users: { id: string; name: string }[];
  onClose: () => void;
}

export function TaskFormModal(props: TaskFormModalProps): JSX.Element {
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
  const [fieldErrors, setFieldErrors] = useState<TaskFormErrors>({});

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
    setFieldErrors({});
    const result = taskFormSchema.safeParse({
      projectId,
      title: title.trim(),
      ...(description.trim() !== '' ? { description: description.trim() } : {}),
      priority,
    });
    if (!result.success) {
      const errs: TaskFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof TaskFormErrors | undefined;
        if (field !== undefined && errs[field] === undefined) {
          errs[field] = issue.message;
        }
      }
      setFieldErrors(errs);
      return;
    }
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
          <Button type="submit" form="task-form" loading={submitting}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id="task-form"
        className="flex flex-col gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Project" htmlFor="task-project" error={fieldErrors.projectId}>
            <Select
              id="task-project"
              options={projects.map((p) => ({ value: p.id, label: p.title }))}
              value={projectId}
              invalid={fieldErrors.projectId !== undefined}
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
        <Field label="Title" htmlFor="task-title" error={fieldErrors.title}>
          <Input
            id="task-title"
            value={title}
            invalid={fieldErrors.title !== undefined}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </Field>
        <Field label="Description" htmlFor="task-description" error={fieldErrors.description}>
          <Textarea
            id="task-description"
            rows={3}
            value={description}
            invalid={fieldErrors.description !== undefined}
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
        {error !== null ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
