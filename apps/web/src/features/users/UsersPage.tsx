import type { UserResponseDto, UserRole, UserStatus } from '@orgflow/shared-types';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Select,
  Skeleton,
  Table,
  type TableColumn,
} from '@orgflow/ui';
import { useMemo, useState, type JSX } from 'react';
import { authStorage } from '../auth/storage.js';
import { useTeams } from '../teams/useTeams.js';
import { EditUserModal } from './EditUserModal.js';
import { InviteUserModal } from './InviteUserModal.js';
import { useUsers, type ListUsersFilters } from './useUsers.js';

const roleOptions: { value: '' | UserRole; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'leader', label: 'Leader' },
  { value: 'member', label: 'Member' },
];

const statusOptions: { value: '' | UserStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

const statusTone: Record<UserStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  pending: 'warning',
  disabled: 'danger',
};

export function UsersPage(): JSX.Element {
  const profile = authStorage.getProfile();
  const isAdmin = profile?.role === 'admin';

  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');
  const [statusFilter, setStatusFilter] = useState<'' | UserStatus>('');
  const [teamFilter, setTeamFilter] = useState<string>('');

  const filters = useMemo<ListUsersFilters>(() => {
    const f: ListUsersFilters = {};
    if (roleFilter !== '') f.role = roleFilter;
    if (statusFilter !== '') f.status = statusFilter;
    if (teamFilter !== '') f.teamId = teamFilter;
    return f;
  }, [roleFilter, statusFilter, teamFilter]);

  const usersQuery = useUsers(filters);
  const teamsQuery = useTeams();

  const [editing, setEditing] = useState<UserResponseDto | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const teamOptions = useMemo(
    () => [
      { value: '', label: 'All teams' },
      ...(teamsQuery.data ?? []).map((t) => ({ value: t.id, label: t.name })),
    ],
    [teamsQuery.data],
  );

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teamsQuery.data ?? []) map.set(t.id, t.name);
    return map;
  }, [teamsQuery.data]);

  const columns = useMemo<TableColumn<UserResponseDto>[]>(() => {
    const base: TableColumn<UserResponseDto>[] = [
      { key: 'name', header: 'Name', render: (u) => u.name },
      { key: 'email', header: 'Email', render: (u) => u.email },
      { key: 'role', header: 'Role', render: (u) => <Badge tone="info">{u.role}</Badge> },
      {
        key: 'team',
        header: 'Team',
        render: (u) => (u.teamId !== null ? (teamNameById.get(u.teamId) ?? '—') : '—'),
      },
      {
        key: 'status',
        header: 'Status',
        render: (u) => <Badge tone={statusTone[u.status]}>{u.status}</Badge>,
      },
    ];
    if (isAdmin) {
      base.push({
        key: 'actions',
        header: '',
        align: 'right',
        render: (u) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(u);
            }}
          >
            Edit
          </Button>
        ),
      });
    }
    return base;
  }, [isAdmin, teamNameById]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage organization members, roles, and access.
          </p>
        </div>
        {isAdmin ? (
          <Button
            onClick={() => {
              setInviteOpen(true);
            }}
          >
            Invite user
          </Button>
        ) : null}
      </header>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Role" htmlFor="user-role-filter">
            <Select
              id="user-role-filter"
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as '' | UserRole);
              }}
            />
          </Field>
          <Field label="Status" htmlFor="user-status-filter">
            <Select
              id="user-status-filter"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as '' | UserStatus);
              }}
            />
          </Field>
          <Field label="Team" htmlFor="user-team-filter">
            <Select
              id="user-team-filter"
              options={teamOptions}
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
              }}
            />
          </Field>
        </div>
      </Card>

      {usersQuery.isLoading ? (
        <Skeleton className="h-40" />
      ) : usersQuery.isError ? (
        <ErrorState
          title="Failed to load users"
          description={usersQuery.error.message}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void usersQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      ) : (
        <Table<UserResponseDto>
          columns={columns}
          rows={usersQuery.data ?? []}
          rowKey={(u) => u.id}
          empty="No users match these filters."
        />
      )}

      {editing !== null ? (
        <EditUserModal
          user={editing}
          teams={teamsQuery.data ?? []}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}

      {inviteOpen ? (
        <InviteUserModal
          teams={teamsQuery.data ?? []}
          onClose={() => {
            setInviteOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
