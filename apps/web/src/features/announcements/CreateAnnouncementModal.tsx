import {
  ANNOUNCEMENT_TARGET_TYPES,
  type AnnouncementTargetType,
  type CreateAnnouncementRequestDto,
} from '@orgflow/shared-types';
import { Button, Field, Input, Modal, Select, Textarea } from '@orgflow/ui';
import { useMemo, useState, type FormEvent, type JSX } from 'react';
import { z } from 'zod';
import { authStorage } from '../auth/storage.js';
import { useTeams } from '../teams/useTeams.js';
import { useUsers } from '../users/useUsers.js';
import { useCreateAnnouncement } from './useAnnouncements.js';

const announcementFormSchema = z.object({
  targetType: z.enum(ANNOUNCEMENT_TARGET_TYPES),
  targetId: z.string().min(1, 'Target is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  body: z
    .string()
    .min(10, 'Body must be at least 10 characters')
    .max(2000, 'Body must be 2 000 characters or fewer'),
});

type AnnouncementFormErrors = Partial<Record<keyof z.infer<typeof announcementFormSchema>, string>>;

export interface CreateAnnouncementModalProps {
  role: 'admin' | 'leader' | 'member';
  onClose: () => void;
}

export function CreateAnnouncementModal({
  role,
  onClose,
}: CreateAnnouncementModalProps): JSX.Element {
  const profile = authStorage.getProfile();
  const teamsQuery = useTeams();
  const usersQuery = useUsers();
  const createMutation = useCreateAnnouncement();

  const allowedTargetTypes: AnnouncementTargetType[] = useMemo(() => {
    if (role === 'admin') return ['organization', 'team', 'user'];
    return ['team', 'user'];
  }, [role]);

  const [targetType, setTargetType] = useState<AnnouncementTargetType>(
    allowedTargetTypes[0] ?? 'team',
  );
  const [targetId, setTargetId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AnnouncementFormErrors>({});

  const teamOptions = useMemo(() => {
    const teams = teamsQuery.data ?? [];
    if (role === 'leader' && profile?.teamId !== null && profile?.teamId !== undefined) {
      return teams
        .filter((t) => t.id === profile.teamId)
        .map((t) => ({ value: t.id, label: t.name }));
    }
    return teams.map((t) => ({ value: t.id, label: t.name }));
  }, [teamsQuery.data, role, profile]);

  const userOptions = useMemo(
    () =>
      (usersQuery.data ?? []).map((u) => ({
        value: u.id,
        label: `${u.name} (${u.email})`,
      })),
    [usersQuery.data],
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    let resolvedTargetId = targetId;
    if (targetType === 'organization') {
      resolvedTargetId = profile?.organizationId ?? '';
    }
    const result = announcementFormSchema.safeParse({
      targetType,
      targetId: resolvedTargetId,
      title: title.trim(),
      body: body.trim(),
    });
    if (!result.success) {
      const errs: AnnouncementFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof AnnouncementFormErrors | undefined;
        if (field !== undefined && errs[field] === undefined) {
          errs[field] = issue.message;
        }
      }
      setFieldErrors(errs);
      return;
    }
    const input: CreateAnnouncementRequestDto = {
      targetType,
      targetId: resolvedTargetId,
      title,
      body,
    };
    createMutation.mutate(input, {
      onSuccess: () => {
        onClose();
      },
      onError: (err: Error) => {
        setError(err.message);
      },
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New announcement"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-announcement-form" loading={createMutation.isPending}>
            Post
          </Button>
        </>
      }
    >
      <form id="create-announcement-form" className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Field label="Target type" htmlFor="targetType">
          <Select
            id="targetType"
            value={targetType}
            options={allowedTargetTypes.map((t) => ({ value: t, label: t }))}
            onChange={(e) => {
              setTargetType(e.target.value as AnnouncementTargetType);
              setTargetId('');
            }}
          />
        </Field>
        {targetType === 'team' ? (
          <Field label="Team" htmlFor="team" error={fieldErrors.targetId}>
            <Select
              id="team"
              value={targetId}
              invalid={fieldErrors.targetId !== undefined}
              options={[{ value: '', label: 'Select team…' }, ...teamOptions]}
              onChange={(e) => {
                setTargetId(e.target.value);
              }}
            />
          </Field>
        ) : null}
        {targetType === 'user' ? (
          <Field label="User" htmlFor="user" error={fieldErrors.targetId}>
            <Select
              id="user"
              value={targetId}
              invalid={fieldErrors.targetId !== undefined}
              options={[{ value: '', label: 'Select user…' }, ...userOptions]}
              onChange={(e) => {
                setTargetId(e.target.value);
              }}
            />
          </Field>
        ) : null}
        <Field label="Title" htmlFor="title" error={fieldErrors.title}>
          <Input
            id="title"
            value={title}
            invalid={fieldErrors.title !== undefined}
            maxLength={200}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </Field>
        <Field label="Body" htmlFor="body" error={fieldErrors.body}>
          <Textarea
            id="body"
            value={body}
            invalid={fieldErrors.body !== undefined}
            rows={6}
            maxLength={2000}
            onChange={(e) => {
              setBody(e.target.value);
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
