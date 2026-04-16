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
import type { ProjectResponseDto, ProjectStatus } from '@orgflow/shared-types';
import { authStorage } from '../auth/storage.js';
import { useTeams } from '../teams/useTeams.js';
import { useUsers } from '../users/useUsers.js';
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
  type ListProjectsFilters,
} from './useProjects.js';

const statusOptions: { value: '' | ProjectStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const statusTone: Record<ProjectStatus, 'default' | 'info' | 'success' | 'warning'> = {
  planned: 'warning',
  active: 'info',
  completed: 'success',
  archived: 'default',
};

function formatDate(iso: string | null): string {
  if (iso === null) return '—';
  return new Date(iso).toLocaleDateString();
}

export function ProjectsPage(): JSX.Element {
  const profile = authStorage.getProfile();
  const canManageAny = profile?.role === 'admin' || profile?.role === 'leader';

  const [statusFilter, setStatusFilter] = useState<'' | ProjectStatus>('');
  const [teamFilter, setTeamFilter] = useState<string>('');

  const teamsQuery = useTeams();
  const usersQuery = useUsers();

  const filters = useMemo<ListProjectsFilters>(() => {
    const f: ListProjectsFilters = {};
    if (statusFilter !== '') f.status = statusFilter;
    if (teamFilter !== '') f.teamId = teamFilter;
    return f;
  }, [statusFilter, teamFilter]);

  const projectsQuery = useProjects(filters);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectResponseDto | null>(null);
  const [deleting, setDeleting] = useState<ProjectResponseDto | null>(null);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teamsQuery.data ?? []) map.set(t.id, t.name);
    return map;
  }, [teamsQuery.data]);

  const teamOptions = useMemo(
    () => [
      { value: '', label: 'All teams' },
      ...(teamsQuery.data ?? []).map((t) => ({ value: t.id, label: t.name })),
    ],
    [teamsQuery.data],
  );

  const columns = useMemo<TableColumn<ProjectResponseDto>[]>(() => {
    const base: TableColumn<ProjectResponseDto>[] = [
      { key: 'title', header: 'Title', render: (p) => p.title },
      {
        key: 'team',
        header: 'Team',
        render: (p) => teamNameById.get(p.teamId) ?? '—',
      },
      {
        key: 'status',
        header: 'Status',
        render: (p) => <Badge tone={statusTone[p.status]}>{p.status}</Badge>,
      },
      {
        key: 'members',
        header: 'Members',
        align: 'right',
        render: (p) => p.memberIds.length,
      },
      { key: 'due', header: 'Due', render: (p) => formatDate(p.dueDate) },
    ];
    if (canManageAny) {
      base.push({
        key: 'actions',
        header: '',
        align: 'right',
        render: (p) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(p);
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setDeleting(p);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      });
    }
    return base;
  }, [canManageAny, teamNameById]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Team-scoped work with membership, dates, and status.
          </p>
        </div>
        {canManageAny ? (
          <Button
            onClick={() => {
              setCreating(true);
            }}
          >
            New project
          </Button>
        ) : null}
      </header>

      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Status" htmlFor="project-status-filter">
            <Select
              id="project-status-filter"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as '' | ProjectStatus);
              }}
            />
          </Field>
          <Field label="Team" htmlFor="project-team-filter">
            <Select
              id="project-team-filter"
              options={teamOptions}
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
              }}
            />
          </Field>
        </div>
      </Card>

      {projectsQuery.isLoading ? (
        <Skeleton className="h-40" />
      ) : projectsQuery.isError ? (
        <ErrorState
          title="Failed to load projects"
          description={projectsQuery.error.message}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void projectsQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      ) : (projectsQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="No projects"
          description="Create your first project to begin tracking work."
        />
      ) : (
        <Table<ProjectResponseDto>
          columns={columns}
          rows={projectsQuery.data ?? []}
          rowKey={(p) => p.id}
        />
      )}

      {creating ? (
        <ProjectFormModal
          teams={teamsQuery.data ?? []}
          users={usersQuery.data ?? []}
          onClose={() => {
            setCreating(false);
          }}
        />
      ) : null}

      {editing !== null ? (
        <ProjectFormModal
          project={editing}
          teams={teamsQuery.data ?? []}
          users={usersQuery.data ?? []}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}

      {deleting !== null ? (
        <DeleteProjectModal
          project={deleting}
          onClose={() => {
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}

interface ProjectFormModalProps {
  project?: ProjectResponseDto;
  teams: { id: string; name: string }[];
  users: { id: string; name: string; teamId: string | null }[];
  onClose: () => void;
}

function ProjectFormModal(props: ProjectFormModalProps): JSX.Element {
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
        if (teamId === '') {
          setError('Team is required');
          return;
        }
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
          <Button
            onClick={() => {
              void onSubmit();
            }}
            loading={submitting}
            disabled={title.trim() === '' || teamId === ''}
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Team" htmlFor="project-team">
            <Select
              id="project-team"
              options={teamSelect}
              value={teamId}
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
        <Field label="Title" htmlFor="project-title">
          <Input
            id="project-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </Field>
        <Field label="Description" htmlFor="project-description">
          <Textarea
            id="project-description"
            rows={3}
            value={description}
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
        {error !== null ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </Modal>
  );
}

interface DeleteProjectModalProps {
  project: ProjectResponseDto;
  onClose: () => void;
}

function DeleteProjectModal(props: DeleteProjectModalProps): JSX.Element {
  const { project, onClose } = props;
  const [error, setError] = useState<string | null>(null);
  const deleteProject = useDeleteProject();

  async function onConfirm(): Promise<void> {
    setError(null);
    try {
      await deleteProject.mutateAsync(project.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${project.title}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleteProject.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void onConfirm();
            }}
            loading={deleteProject.isPending}
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm">
        This permanently removes <strong>{project.title}</strong> and all its tasks.
      </p>
      {error !== null ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </Modal>
  );
}
