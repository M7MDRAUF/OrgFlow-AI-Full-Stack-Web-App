import type { TeamResponseDto } from '@orgflow/shared-types';
import { Button, Card, ErrorState, Skeleton, Table, type TableColumn } from '@orgflow/ui';
import { useMemo, useState, type JSX } from 'react';
import { authStorage } from '../auth/storage.js';
import { useUsers } from '../users/useUsers.js';
import { DeleteTeamModal } from './DeleteTeamModal.js';
import { TeamFormModal } from './TeamFormModal.js';
import { TeamMembersModal } from './TeamMembersModal.js';
import { useTeams } from './useTeams.js';

export function TeamsPage(): JSX.Element {
  const profile = authStorage.getProfile();
  const isAdmin = profile?.role === 'admin';

  const teamsQuery = useTeams();
  const usersQuery = useUsers();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamResponseDto | null>(null);
  const [deleting, setDeleting] = useState<TeamResponseDto | null>(null);
  const [viewingMembers, setViewingMembers] = useState<TeamResponseDto | null>(null);

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
        render: (t) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setViewingMembers(t);
            }}
          >
            {t.memberCount} members
          </Button>
        ),
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

      {viewingMembers !== null ? (
        <TeamMembersModal
          team={viewingMembers}
          onClose={() => {
            setViewingMembers(null);
          }}
        />
      ) : null}
    </div>
  );
}
