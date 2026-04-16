import { useMemo, useState, type JSX } from 'react';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
  type TableColumn,
} from '@orgflow/ui';
import type { UserResponseDto } from '@orgflow/shared-types';
import { authStorage } from '../auth/storage.js';
import { useTeams } from '../teams/useTeams.js';
import {
  useInviteUser,
  useUpdateUser,
  useUpdateUserStatus,
  useUsers,
  type ListUsersFilters,
} from './useUsers.js';

type UserRole = 'admin' | 'leader' | 'member';
type UserStatus = 'pending' | 'active' | 'disabled';

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

interface EditUserModalProps {
  user: UserResponseDto;
  teams: { id: string; name: string }[];
  onClose: () => void;
}

function EditUserModal(props: EditUserModalProps): JSX.Element {
  const { user, teams, onClose } = props;
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [teamId, setTeamId] = useState<string>(user.teamId ?? '');
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [error, setError] = useState<string | null>(null);

  const updateUser = useUpdateUser();
  const updateStatus = useUpdateUserStatus();
  const submitting = updateUser.isPending || updateStatus.isPending;

  const roleSelect: { value: UserRole; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'leader', label: 'Leader' },
    { value: 'member', label: 'Member' },
  ];
  const statusSelect: { value: UserStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
  ];
  const teamSelect = [
    { value: '', label: 'No team' },
    ...teams.map((t) => ({ value: t.id, label: t.name })),
  ];

  async function onSubmit(): Promise<void> {
    setError(null);
    try {
      const nextTeam = teamId === '' ? null : teamId;
      const input: {
        name?: string;
        role?: UserRole;
        teamId?: string | null;
      } = {};
      if (name.trim() !== user.name) input.name = name.trim();
      if (role !== user.role) input.role = role;
      if (nextTeam !== user.teamId) input.teamId = nextTeam;
      if (Object.keys(input).length > 0) {
        await updateUser.mutateAsync({ id: user.id, input });
      }
      if (status !== user.status) {
        await updateStatus.mutateAsync({ id: user.id, input: { status } });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${user.name}`}
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
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Name" htmlFor="edit-user-name">
          <Input
            id="edit-user-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </Field>
        <Field label="Role" htmlFor="edit-user-role">
          <Select
            id="edit-user-role"
            options={roleSelect}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole);
            }}
          />
        </Field>
        <Field label="Team" htmlFor="edit-user-team">
          <Select
            id="edit-user-team"
            options={teamSelect}
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
            }}
          />
        </Field>
        <Field label="Status" htmlFor="edit-user-status">
          <Select
            id="edit-user-status"
            options={statusSelect}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as UserStatus);
            }}
          />
        </Field>
        {error !== null ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </Modal>
  );
}

interface InviteUserModalProps {
  teams: { id: string; name: string }[];
  onClose: () => void;
}

function InviteUserModal(props: InviteUserModalProps): JSX.Element {
  const { teams, onClose } = props;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [teamId, setTeamId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const invite = useInviteUser();

  const roleSelect: { value: UserRole; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'leader', label: 'Leader' },
    { value: 'member', label: 'Member' },
  ];
  const teamSelect = [
    { value: '', label: 'No team' },
    ...teams.map((t) => ({ value: t.id, label: t.name })),
  ];

  async function onSubmit(): Promise<void> {
    setError(null);
    try {
      const result = await invite.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        ...(teamId !== '' ? { teamId } : {}),
      });
      setInviteToken(result.inviteToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite user"
      footer={
        inviteToken !== null ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={invite.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void onSubmit();
              }}
              loading={invite.isPending}
            >
              Send invite
            </Button>
          </>
        )
      }
    >
      {inviteToken !== null ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Share this activation link (valid for 7 days):</p>
          <code className="block break-all rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
            {window.location.origin}/activate?token={inviteToken}
          </code>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Field label="Name" htmlFor="invite-name">
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
            />
          </Field>
          <Field label="Email" htmlFor="invite-email">
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <Select
              id="invite-role"
              options={roleSelect}
              value={role}
              onChange={(e) => {
                setRole(e.target.value as UserRole);
              }}
            />
          </Field>
          <Field label="Team" htmlFor="invite-team">
            <Select
              id="invite-team"
              options={teamSelect}
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
              }}
            />
          </Field>
          {error !== null ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
