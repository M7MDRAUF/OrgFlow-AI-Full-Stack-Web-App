import { useMemo, useState, type FormEvent, type JSX } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Select,
  Skeleton,
  Textarea,
} from '@orgflow/ui';
import type {
  AnnouncementResponseDto,
  AnnouncementTargetType,
  CreateAnnouncementRequestDto,
} from '@orgflow/shared-types';
import { authStorage } from '../auth/storage.js';
import { useTeams } from '../teams/useTeams.js';
import { useUsers } from '../users/useUsers.js';
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
} from './useAnnouncements.js';

export function AnnouncementsPage(): JSX.Element {
  const profile = authStorage.getProfile();
  const role = profile?.role ?? 'member';
  const canCreate = role === 'admin' || role === 'leader';

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const listQuery = useAnnouncements({ unreadOnly });
  const markRead = useMarkAnnouncementRead();
  const deleteMutation = useDeleteAnnouncement();

  if (listQuery.isLoading) return <Skeleton className="h-40" />;
  if (listQuery.isError) {
    return (
      <ErrorState
        title="Failed to load announcements"
        description={listQuery.error.message}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void listQuery.refetch();
            }}
          >
            Retry
          </Button>
        }
      />
    );
  }

  const announcements = listQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Org-wide, team, and personal notes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
              }}
            />
            Unread only
          </label>
          {canCreate ? (
            <Button
              onClick={() => {
                setCreateOpen(true);
              }}
            >
              New announcement
            </Button>
          ) : null}
        </div>
      </header>

      {announcements.length === 0 ? (
        <EmptyState title="No announcements" description="You're all caught up." />
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((a) => (
            <li key={a.id}>
              <AnnouncementItem
                announcement={a}
                currentUserId={profile?.userId ?? ''}
                currentRole={role}
                onMarkRead={() => {
                  markRead.mutate(a.id);
                }}
                onDelete={() => {
                  if (window.confirm('Delete this announcement?')) {
                    deleteMutation.mutate(a.id);
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <CreateAnnouncementModal
          role={role}
          onClose={() => {
            setCreateOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

interface AnnouncementItemProps {
  announcement: AnnouncementResponseDto;
  currentUserId: string;
  currentRole: 'admin' | 'leader' | 'member';
  onMarkRead: () => void;
  onDelete: () => void;
}

function AnnouncementItem({
  announcement,
  currentUserId,
  currentRole,
  onMarkRead,
  onDelete,
}: AnnouncementItemProps): JSX.Element {
  const canDelete = currentRole === 'admin' || announcement.createdBy === currentUserId;
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">{announcement.title}</h3>
            <Badge tone={targetBadgeTone(announcement.targetType)}>{announcement.targetType}</Badge>
            {!announcement.readByCurrentUser ? <Badge tone="info">Unread</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            {!announcement.readByCurrentUser ? (
              <Button variant="ghost" size="sm" onClick={onMarkRead}>
                Mark read
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
          {announcement.body}
        </p>
        <p className="text-xs text-slate-500">
          {new Date(announcement.createdAt).toLocaleString()}
        </p>
      </div>
    </Card>
  );
}

function targetBadgeTone(t: AnnouncementTargetType): 'default' | 'info' | 'success' | 'warning' {
  if (t === 'organization') return 'info';
  if (t === 'team') return 'success';
  return 'warning';
}

interface CreateAnnouncementModalProps {
  role: 'admin' | 'leader' | 'member';
  onClose: () => void;
}

function CreateAnnouncementModal({ role, onClose }: CreateAnnouncementModalProps): JSX.Element {
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
    let resolvedTargetId = targetId;
    if (targetType === 'organization') {
      resolvedTargetId = profile?.organizationId ?? '';
    }
    if (resolvedTargetId === '') {
      setError('Select a target.');
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
          <Field label="Team" htmlFor="team">
            <Select
              id="team"
              value={targetId}
              options={[{ value: '', label: 'Select team…' }, ...teamOptions]}
              onChange={(e) => {
                setTargetId(e.target.value);
              }}
            />
          </Field>
        ) : null}
        {targetType === 'user' ? (
          <Field label="User" htmlFor="user">
            <Select
              id="user"
              value={targetId}
              options={[{ value: '', label: 'Select user…' }, ...userOptions]}
              onChange={(e) => {
                setTargetId(e.target.value);
              }}
            />
          </Field>
        ) : null}
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            value={title}
            required
            maxLength={200}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </Field>
        <Field label="Body" htmlFor="body">
          <Textarea
            id="body"
            value={body}
            required
            rows={6}
            maxLength={10000}
            onChange={(e) => {
              setBody(e.target.value);
            }}
          />
        </Field>
        {error !== null ? <p className="text-sm text-rose-600">{error}</p> : null}
      </form>
    </Modal>
  );
}
