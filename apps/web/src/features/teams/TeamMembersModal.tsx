import type { TeamResponseDto, UserResponseDto } from '@orgflow/shared-types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Modal,
  Skeleton,
  Table,
  type TableColumn,
} from '@orgflow/ui';
import { useMemo, type JSX } from 'react';
import { useUsers } from '../users/useUsers.js';

export interface TeamMembersModalProps {
  team: TeamResponseDto;
  onClose: () => void;
}

export function TeamMembersModal({ team, onClose }: TeamMembersModalProps): JSX.Element {
  const membersQuery = useUsers({ teamId: team.id });

  const memberColumns = useMemo<TableColumn<UserResponseDto>[]>(
    () => [
      { key: 'name', header: 'Name', render: (u) => u.name },
      { key: 'email', header: 'Email', render: (u) => u.email },
      {
        key: 'role',
        header: 'Role',
        render: (u) => (
          <Badge tone={u.role === 'admin' ? 'warning' : u.role === 'leader' ? 'info' : 'default'}>
            {u.role}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (u) => (
          <Badge
            tone={
              u.status === 'active' ? 'success' : u.status === 'pending' ? 'warning' : 'default'
            }
          >
            {u.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Members of ${team.name}`}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      {membersQuery.isLoading ? (
        <Skeleton className="h-24" />
      ) : membersQuery.isError ? (
        <ErrorState title="Failed to load members" description={membersQuery.error.message} />
      ) : (membersQuery.data ?? []).length === 0 ? (
        <EmptyState title="No members" description="This team has no members yet." />
      ) : (
        <Table<UserResponseDto>
          columns={memberColumns}
          rows={membersQuery.data ?? []}
          rowKey={(u) => u.id}
        />
      )}
    </Modal>
  );
}
