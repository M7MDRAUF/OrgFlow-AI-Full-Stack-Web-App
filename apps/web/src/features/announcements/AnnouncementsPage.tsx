import { type AnnouncementResponseDto, type AnnouncementTargetType } from '@orgflow/shared-types';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@orgflow/ui';
import { useState, type JSX } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { authStorage } from '../auth/storage.js';
import { CreateAnnouncementModal } from './CreateAnnouncementModal.js';
import { EditAnnouncementModal } from './EditAnnouncementModal.js';
import {
  useAnnouncements,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
} from './useAnnouncements.js';

export function AnnouncementsPage(): JSX.Element {
  const profile = authStorage.getProfile();
  const role = profile?.role ?? 'member';
  const canCreate = role === 'admin' || role === 'leader';

  const [unreadOnly, setUnreadOnly] = useState(role === 'member');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementResponseDto | null>(null);

  const listQuery = useAnnouncements({ unreadOnly });
  const markRead = useMarkAnnouncementRead();
  const deleteMutation = useDeleteAnnouncement();
  const [confirmDelete, setConfirmDelete] = useState<AnnouncementResponseDto | null>(null);

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
          <label className="flex items-center gap-2 text-sm" htmlFor="unread-only-toggle">
            <input
              id="unread-only-toggle"
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
                onEdit={() => {
                  setEditing(a);
                }}
                onDelete={() => {
                  setConfirmDelete(a);
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

      {editing !== null ? (
        <EditAnnouncementModal
          announcement={editing}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete announcement"
        message="Are you sure you want to delete this announcement?"
        onConfirm={() => {
          if (confirmDelete !== null) deleteMutation.mutate(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => {
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

interface AnnouncementItemProps {
  announcement: AnnouncementResponseDto;
  currentUserId: string;
  currentRole: 'admin' | 'leader' | 'member';
  onMarkRead: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AnnouncementItem({
  announcement,
  currentUserId,
  currentRole,
  onMarkRead,
  onEdit,
  onDelete,
}: AnnouncementItemProps): JSX.Element {
  const canModify = currentRole === 'admin' || announcement.createdBy === currentUserId;
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
            {canModify ? (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                Edit
              </Button>
            ) : null}
            {canModify ? (
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
          {announcement.body}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
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
