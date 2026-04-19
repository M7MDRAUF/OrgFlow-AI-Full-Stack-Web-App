import { type ProjectResponseDto, type ProjectStatus } from '@orgflow/shared-types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
  Table,
  type TableColumn,
} from '@orgflow/ui';
import { useMemo, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { useDebouncedValue } from '../../lib/use-debounced-value.js';
import { authStorage } from '../auth/storage.js';
import { useTeams } from '../teams/useTeams.js';
import { useUsers } from '../users/useUsers.js';
import { DeleteProjectModal } from './DeleteProjectModal.js';
import { ProjectFormModal } from './ProjectFormModal.js';
import { useProjects, type ListProjectsFilters } from './useProjects.js';

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
  // H-022 RoleGuard policy: admins + leaders may create/edit/delete projects.
  // Members have read-only access (enforced server-side; reflected here in UI).
  const canManageAny = profile?.role === 'admin' || profile?.role === 'leader';

  const [statusFilter, setStatusFilter] = useState<'' | ProjectStatus>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');

  const teamsQuery = useTeams();
  const usersQuery = useUsers();

  const debouncedSearch = useDebouncedValue(searchFilter, 300);

  const filters = useMemo<ListProjectsFilters>(() => {
    const f: ListProjectsFilters = {};
    if (statusFilter !== '') f.status = statusFilter;
    if (teamFilter !== '') f.teamId = teamFilter;
    const trimmed = debouncedSearch.trim();
    if (trimmed !== '') f.search = trimmed;
    return f;
  }, [statusFilter, teamFilter, debouncedSearch]);

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
      {
        key: 'title',
        header: 'Title',
        render: (p) => (
          <Link
            to={`/projects/${p.id}`}
            className="text-brand-600 hover:underline dark:text-brand-400"
          >
            {p.title}
          </Link>
        ),
      },
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
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Search" htmlFor="project-search-filter">
            <Input
              id="project-search-filter"
              placeholder="Search by title…"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
              }}
            />
          </Field>
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
