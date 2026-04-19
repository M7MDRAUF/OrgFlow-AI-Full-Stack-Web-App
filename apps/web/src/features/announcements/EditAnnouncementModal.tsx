import type { AnnouncementResponseDto } from '@orgflow/shared-types';
import { Button, Field, Input, Modal, Textarea } from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import { useUpdateAnnouncement } from './useAnnouncements.js';

export interface EditAnnouncementModalProps {
  announcement: AnnouncementResponseDto;
  onClose: () => void;
}

export function EditAnnouncementModal({
  announcement,
  onClose,
}: EditAnnouncementModalProps): JSX.Element {
  const updateMutation = useUpdateAnnouncement();
  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (trimmedTitle.length === 0) {
      setError('Title is required.');
      return;
    }
    if (trimmedBody.length < 10) {
      setError('Body must be at least 10 characters.');
      return;
    }
    const input: { title?: string; body?: string } = {};
    if (trimmedTitle !== announcement.title) input.title = trimmedTitle;
    if (trimmedBody !== announcement.body) input.body = trimmedBody;
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    updateMutation.mutate(
      { id: announcement.id, input },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: Error) => {
          setError(err.message);
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit announcement"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-announcement-form" loading={updateMutation.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="edit-announcement-form" className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Field label="Title" htmlFor="edit-title">
          <Input
            id="edit-title"
            value={title}
            maxLength={200}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </Field>
        <Field label="Body" htmlFor="edit-body">
          <Textarea
            id="edit-body"
            value={body}
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
