import type { TeamResponseDto } from '@orgflow/shared-types';
import { Button, Modal } from '@orgflow/ui';
import { useState, type JSX } from 'react';
import { useDeleteTeam } from './useTeams.js';

export interface DeleteTeamModalProps {
  team: TeamResponseDto;
  onClose: () => void;
}

export function DeleteTeamModal(props: DeleteTeamModalProps): JSX.Element {
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
      {error !== null ? (
        <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
