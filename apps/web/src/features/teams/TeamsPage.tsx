import { useMemo, useState, type JSX } from 'react';
import {
  Button,
  Card,
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
import type { TeamResponseDto, UserResponseDto } from '@orgflow/shared-types';
import { authStorage } from '../auth/storage.js';
import { useUsers } from '../users/useUsers.js';
import { useCreateTeam, useDeleteTeam, useTeams, useUpdateTeam } from './useTeams.js';

export function TeamsPage(): JSX.Element {
  const profile = authStorage.getProfile();
  const isAdmin = profile?.role === 'admin';

  const teamsQuery = useTeams();
  const usersQuery = useUsers();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamResponseDto | null>(null);
  const [deleting, setDeleting] = useState<TeamResponseDto | null>(null);

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of usersQuery.data ?? []) map.set(u.id, u.name);
    return map;
  }, [usersQuery.data]);

  const columns = useMemo<TableColumn<TeamResponseDto>[]>(() => {
    const base: TableColumn<TeamResponseDto>[] = [
      { key: 'name', header: 'Name', render: (t) => t.name },
      {
        key: 'description',
        header: 'Description',
        render: (t) => t.description ?? '—',
      },
      {
        key: 'leader',
        header: 'Leader',
        render: (t) => (t.leaderId !== null ? (userNameById.get(t.leaderId) ?? '—') : '—'),
      },
      {
        key: 'members',
        header: 'Members',
        align: 'right',
        render: (t) => t.memberCount,
      },
    ];
    if (isAdmin) {
      base.push({
        key: 'actions',
        header: '',
        align: 'right',
        render: (t) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(t);
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setDeleting(t);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      });
    }
    return base;
  }, [isAdmin, userNameById]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teams</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organize people into teams and assign leaders.
          </p>
        </div>
        {isAdmin ? (
          <Button
            onClick={() => {
              setCreating(true);
            }}
          >
            New team
          </Button>
        ) : null}
      </header>

      {teamsQuery.isLoading ? (
        <Skeleton className="h-40" />
      ) : teamsQuery.isError ? (
        <ErrorState
          title="Failed to load teams"
          description={teamsQuery.error.message}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void teamsQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      ) : (
        <Card>
          <Table<TeamResponseDto>
            columns={columns}
            rows={teamsQuery.data ?? []}
            rowKey={(t) => t.id}
            empty="No teams yet."
          />
        </Card>
      )}

      {creating ? (
        <TeamFormModal
          users={usersQuery.data ?? []}
          onClose={() => {
            setCreating(false);
          }}
        />
      ) : null}

      {editing !== null ? (
        <TeamFormModal
          team={editing}
          users={usersQuery.data ?? []}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}

      {deleting !== null ? (
        <DeleteTeamModal
          team={deleting}
          onClose={() => {
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}

interface TeamFormModalProps {
  team?: TeamResponseDto;
  users: UserResponseDto[];
  onClose: () => void;
}

function TeamFormModal(props: TeamFormModalProps): JSX.Element {
  const { team, users, onClose } = props;
  const isEdit = team !== undefined;
  const [name, setName] = useState(team?.name ?? '');
  const [description, setDescription] = useState(team?.description ?? '');
  const [leaderId, setLeaderId] = useState<string>(team?.leaderId ?? '');
  const [error, setError] = useState<string | null>(null);

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const submitting = createTeam.isPending || updateTeam.isPending;

  const leaderOptions = [
    { value: '', label: 'No leader' },
    ...users
      .filter((u) => u.role === 'admin' || u.role === 'leader')
      .map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
  ];

  async function onSubmit(): Promise<void> {
    setError(null);
    try {
      const trimmedName = name.trim();
      const trimmedDesc = description.trim();
      if (isEdit) {
        const input: { name?: string; description?: string | null; leaderId?: string | null } = {};
        if (trimmedName !== team.name) input.name = trimmedName;
        const nextDesc = trimmedDesc === '' ? null : trimmedDesc;
        if (nextDesc !== team.description) input.description = nextDesc;
        const nextLeader = leaderId === '' ? null : leaderId;
        if (nextLeader !== team.leaderId) input.leaderId = nextLeader;
        if (Object.keys(input).length > 0) {
          await updateTeam.mutateAsync({ id: team.id, input });
        }
      } else {
        await createTeam.mutateAsync({
          name: trimmedName,
          ...(trimmedDesc !== '' ? { description: trimmedDesc } : {}),
          ...(leaderId !== '' ? { leaderId } : {}),
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
      title={isEdit ? `Edit ${team.name}` : 'Create team'}
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
            disabled={name.trim() === ''}
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Name" htmlFor="team-name">
          <Input
            id="team-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </Field>
        <Field label="Description" htmlFor="team-description">
          <Textarea
            id="team-description"
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </Field>
        <Field label="Leader" htmlFor="team-leader">
          <Select
            id="team-leader"
            options={leaderOptions}
            value={leaderId}
            onChange={(e) => {
              setLeaderId(e.target.value);
            }}
          />
        </Field>
        {error !== null ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </Modal>
  );
}

interface DeleteTeamModalProps {
  team: TeamResponseDto;
  onClose: () => void;
}

function DeleteTeamModal(props: DeleteTeamModalProps): JSX.Element {
  const { team, onClose } = props;
  const [error, setError] = useState<string | null>(null);
  const deleteTeam = useDeleteTeam();

  async function onConfirm(): Promise<void> {
    setError(null);
    try {
      await deleteTeam.mutateAsync(team.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${team.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleteTeam.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void onConfirm();
            }}
            loading={deleteTeam.isPending}
          >
            Delete team
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-700 dark:text-slate-200">
        This will permanently delete <strong>{team.name}</strong>. Members assigned to this team
        will have their team set to none. This cannot be undone.
      </p>
      {error !== null ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </Modal>
  );
}
