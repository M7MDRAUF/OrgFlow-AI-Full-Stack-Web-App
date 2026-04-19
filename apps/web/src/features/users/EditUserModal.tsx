import type { UserResponseDto, UserRole, UserStatus } from '@orgflow/shared-types';
import { Button, Field, Input, Modal, Select } from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import { useUpdateUser, useUpdateUserStatus } from './useUsers.js';

export interface EditUserModalProps {
  user: UserResponseDto;
  teams: { id: string; name: string }[];
  onClose: () => void;
}

export function EditUserModal(props: EditUserModalProps): JSX.Element {
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
          <Button type="submit" form="edit-user-form" loading={submitting}>
            Save
          </Button>
        </>
      }
    >
      <form
        id="edit-user-form"
        className="flex flex-col gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
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
        {error !== null ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
