import {
  PROJECT_STATUSES,
  type ProjectResponseDto,
  type ProjectStatus,
} from '@orgflow/shared-types';
import { Button, Field, Input, Modal, Select, Textarea } from '@orgflow/ui';
import { useMemo, useState, type FormEvent, type JSX } from 'react';
import { z } from 'zod';
import { useCreateProject, useUpdateProject } from './useProjects.js';

const projectFormSchema = z.object({
  teamId: z.string().min(1, 'Team is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  description: z.string().max(5000, 'Description must be 5 000 characters or fewer').optional(),
  status: z.enum(PROJECT_STATUSES),
});

type ProjectFormErrors = Partial<Record<keyof z.infer<typeof projectFormSchema>, string>>;

export interface ProjectFormModalProps {
  project?: ProjectResponseDto;
  teams: { id: string; name: string }[];
  users: { id: string; name: string; teamId: string | null }[];
  onClose: () => void;
}

export function ProjectFormModal(props: ProjectFormModalProps): JSX.Element {
  const { project, teams, users, onClose } = props;
  const isEdit = project !== undefined;

  const [teamId, setTeamId] = useState<string>(project?.teamId ?? teams[0]?.id ?? '');
  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'planned');
  const [memberIds, setMemberIds] = useState<string[]>(project?.memberIds ?? []);
  const [startDate, setStartDate] = useState<string>(
    project?.startDate !== undefined && project.startDate !== null
      ? project.startDate.slice(0, 10)
      : '',
  );
  const [dueDate, setDueDate] = useState<string>(
    project?.dueDate !== undefined && project.dueDate !== null ? project.dueDate.slice(0, 10) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProjectFormErrors>({});

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const submitting = createProject.isPending || updateProject.isPending;

  const teamSelect = teams.map((t) => ({ value: t.id, label: t.name }));
  const statusSelect: { value: ProjectStatus; label: string }[] = [
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' },
  ];

  const eligibleMembers = useMemo(() => users.filter((u) => u.teamId === teamId), [users, teamId]);

  function toggleMember(id: string): void {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function toIsoOrNull(value: string): string | null {
    if (value === '') return null;
    return new Date(value).toISOString();
  }

  async function onSubmit(): Promise<void> {
    setError(null);
    setFieldErrors({});
    const result = projectFormSchema.safeParse({
      teamId,
      title: title.trim(),
      ...(description.trim() !== '' ? { description: description.trim() } : {}),
      status,
    });
    if (!result.success) {
      const errs: ProjectFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProjectFormErrors | undefined;
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
          memberIds?: string[];
          status?: ProjectStatus;
          startDate?: string | null;
          dueDate?: string | null;
        } = {};
        if (title.trim() !== project.title) input.title = title.trim();
        const nextDesc = description.trim() === '' ? null : description.trim();
        if (nextDesc !== project.description) input.description = nextDesc;
        if (status !== project.status) input.status = status;
        if (JSON.stringify(memberIds) !== JSON.stringify(project.memberIds))
          input.memberIds = memberIds;
        const nextStart = toIsoOrNull(startDate);
        if (nextStart !== project.startDate) input.startDate = nextStart;
        const nextDue = toIsoOrNull(dueDate);
        if (nextDue !== project.dueDate) input.dueDate = nextDue;
        if (Object.keys(input).length > 0) {
          await updateProject.mutateAsync({ id: project.id, input });
        }
      } else {
        await createProject.mutateAsync({
          teamId,
          title: title.trim(),
          ...(description.trim() !== '' ? { description: description.trim() } : {}),
          ...(memberIds.length > 0 ? { memberIds } : {}),
          status,
          ...(startDate !== '' ? { startDate: new Date(startDate).toISOString() } : {}),
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
      title={isEdit ? `Edit ${project.title}` : 'Create project'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" loading={submitting}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id="project-form"
        className="flex flex-col gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Team" htmlFor="project-team" error={fieldErrors.teamId}>
            <Select
              id="project-team"
              options={teamSelect}
              value={teamId}
              invalid={fieldErrors.teamId !== undefined}
              onChange={(e) => {
                setTeamId(e.target.value);
                setMemberIds([]);
              }}
              disabled={isEdit}
            />
          </Field>
          <Field label="Status" htmlFor="project-status">
            <Select
              id="project-status"
              options={statusSelect}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ProjectStatus);
              }}
            />
          </Field>
        </div>
        <Field label="Title" htmlFor="project-title" error={fieldErrors.title}>
          <Input
            id="project-title"
            value={title}
            invalid={fieldErrors.title !== undefined}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </Field>
        <Field label="Description" htmlFor="project-description" error={fieldErrors.description}>
          <Textarea
            id="project-description"
            rows={3}
            value={description}
            invalid={fieldErrors.description !== undefined}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Start date" htmlFor="project-start">
            <Input
              id="project-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
              }}
            />
          </Field>
          <Field label="Due date" htmlFor="project-due">
            <Input
              id="project-due"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
              }}
            />
          </Field>
        </div>
        <Field label="Members" htmlFor="project-members" hint="Members must belong to the team.">
          <div
            id="project-members"
            className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-slate-200 p-2 dark:border-slate-700"
          >
            {eligibleMembers.length === 0 ? (
              <p className="text-xs text-slate-500">No users in this team.</p>
            ) : (
              eligibleMembers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={memberIds.includes(u.id)}
                    onChange={() => {
                      toggleMember(u.id);
                    }}
                  />
                  {u.name}
                </label>
              ))
            )}
          </div>
        </Field>
        {error !== null ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
