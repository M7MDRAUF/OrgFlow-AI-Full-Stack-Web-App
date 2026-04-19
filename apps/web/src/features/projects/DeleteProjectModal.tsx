import type { ProjectResponseDto } from '@orgflow/shared-types';
import { Button, Modal } from '@orgflow/ui';
import { useState, type JSX } from 'react';
import { useDeleteProject } from './useProjects.js';

export interface DeleteProjectModalProps {
  project: ProjectResponseDto;
  onClose: () => void;
}

export function DeleteProjectModal(props: DeleteProjectModalProps): JSX.Element {
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
      <p className="text-sm text-slate-700 dark:text-slate-200">
        This permanently removes <strong>{project.title}</strong> and all its tasks.
      </p>
      {error !== null ? (
        <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
