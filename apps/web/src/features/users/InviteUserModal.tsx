import type { UserRole } from '@orgflow/shared-types';
import { Button, Field, Input, Modal, Select } from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import { useInviteUser } from './useUsers.js';

export interface InviteUserModalProps {
  teams: { id: string; name: string }[];
  onClose: () => void;
}

export function InviteUserModal(props: InviteUserModalProps): JSX.Element {
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
            <Button type="submit" form="invite-user-form" loading={invite.isPending}>
              Send invite
            </Button>
          </>
        )
      }
    >
      {inviteToken !== null ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Activation link generated (valid for 7 days).</p>
          {/* BUG-LOW-23: do NOT render the raw token in the DOM — use clipboard
              copy instead so the single-use token is not accessible to XSS or
              browser extensions inspecting the DOM. */}
          <Button
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(
                `${window.location.origin}/activate?token=${inviteToken}`,
              );
            }}
          >
            Copy invite link
          </Button>
        </div>
      ) : (
        <form
          id="invite-user-form"
          className="flex flex-col gap-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
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
          {error !== null ? (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </Modal>
  );
}
