import type { TeamResponseDto, UserResponseDto } from '@orgflow/shared-types';
import { Button, Field, Input, Modal, Select, Textarea } from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import { useCreateTeam, useUpdateTeam } from './useTeams.js';

export interface TeamFormModalProps {
  team?: TeamResponseDto;
  users: UserResponseDto[];
  onClose: () => void;
}

export function TeamFormModal(props: TeamFormModalProps): JSX.Element {
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
          <Button type="submit" form="team-form" loading={submitting} disabled={name.trim() === ''}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id="team-form"
        className="flex flex-col gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
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
        {error !== null ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
