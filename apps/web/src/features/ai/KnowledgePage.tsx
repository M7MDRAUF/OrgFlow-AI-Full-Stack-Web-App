// rag-ingest-agent — Admin-only document upload & management page.
import {
  DOCUMENT_VISIBILITIES,
  type DocumentResponseDto,
  type DocumentStatus,
  type DocumentVisibility,
} from '@orgflow/shared-types';
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
  Table,
  type TableColumn,
} from '@orgflow/ui';
import { useMemo, useRef, useState, type FormEvent, type JSX } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { useTeams } from '../teams/useTeams.js';
import { useDeleteDocument, useDocuments, useUploadDocument } from './useDocuments.js';

const statusTone: Record<DocumentStatus, 'default' | 'info' | 'success' | 'warning'> = {
  uploaded: 'default',
  parsed: 'info',
  indexed: 'success',
  failed: 'warning',
};

export function KnowledgePage(): JSX.Element {
  const docsQuery = useDocuments();
  const { mutate: deleteDocument } = useDeleteDocument();
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DocumentResponseDto | null>(null);

  const columns = useMemo<TableColumn<DocumentResponseDto>[]>(
    () => [
      { key: 'title', header: 'Title', render: (d) => d.title },
      { key: 'filename', header: 'File', render: (d) => d.originalFilename },
      {
        key: 'visibility',
        header: 'Visibility',
        render: (d) => <Badge tone="info">{d.visibility}</Badge>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (d) => <Badge tone={statusTone[d.status]}>{d.status}</Badge>,
      },
      {
        key: 'chunks',
        header: 'Chunks',
        align: 'right',
        render: (d) => d.chunkCount ?? '—',
      },
      {
        key: 'date',
        header: 'Uploaded',
        render: (d) => new Date(d.createdAt).toLocaleDateString(),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (d) => (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setConfirmDelete(d);
            }}
          >
            Delete
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload and manage documents for the AI assistant.
          </p>
        </div>
        <Button
          onClick={() => {
            setUploading(true);
          }}
        >
          Upload document
        </Button>
      </header>

      {docsQuery.isLoading ? (
        <Skeleton className="h-40" />
      ) : docsQuery.isError ? (
        <ErrorState
          title="Failed to load documents"
          description={docsQuery.error.message}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void docsQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      ) : (docsQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="No documents"
          description="Upload your first document to start building the knowledge base."
        />
      ) : (
        <Card>
          <Table<DocumentResponseDto>
            columns={columns}
            rows={docsQuery.data ?? []}
            rowKey={(d) => d.id}
          />
        </Card>
      )}

      {uploading ? (
        <UploadDocumentModal
          onClose={() => {
            setUploading(false);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete document"
        message={
          confirmDelete !== null ? `Are you sure you want to delete "${confirmDelete.title}"?` : ''
        }
        onConfirm={() => {
          if (confirmDelete !== null) deleteDocument(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => {
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

interface UploadDocumentModalProps {
  onClose: () => void;
}

function UploadDocumentModal({ onClose }: UploadDocumentModalProps): JSX.Element {
  const teamsQuery = useTeams();
  const uploadMutation = useUploadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>('organization');
  const [teamId, setTeamId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teamOptions = useMemo(
    () => [
      { value: '', label: 'Select team…' },
      ...(teamsQuery.data ?? []).map((t) => ({ value: t.id, label: t.name })),
    ],
    [teamsQuery.data],
  );

  // 'project' visibility requires a project selector which is not yet implemented
  // in this modal. Filter it out to prevent silent backend failures.
  const visibilityOptions = DOCUMENT_VISIBILITIES.filter((v) => v !== 'project').map((v) => ({
    value: v,
    label: v,
  }));

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);

    if (selectedFile === null) {
      setError('Please select a file to upload.');
      return;
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setError('Title is required.');
      return;
    }
    if (visibility === 'team' && teamId === '') {
      setError('Team is required for team-scoped documents.');
      return;
    }

    const vars: Parameters<typeof uploadMutation.mutate>[0] = {
      file: selectedFile,
      title: trimmedTitle,
      visibility,
    };
    if (visibility === 'team') vars.teamId = teamId;

    uploadMutation.mutate(vars, {
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
      title="Upload document"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="upload-document-form" loading={uploadMutation.isPending}>
            Upload
          </Button>
        </>
      }
    >
      <form id="upload-document-form" className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Field label="File" htmlFor="doc-file">
          <input
            id="doc-file"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-slate-300 dark:file:bg-brand-900 dark:file:text-brand-200"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSelectedFile(file);
              if (file !== null && title.trim().length === 0) {
                setTitle(file.name.replace(/\.[^.]+$/, ''));
              }
            }}
          />
        </Field>
        <Field label="Title" htmlFor="doc-title">
          <Input
            id="doc-title"
            value={title}
            maxLength={200}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </Field>
        <Field label="Visibility" htmlFor="doc-visibility">
          <Select
            id="doc-visibility"
            value={visibility}
            options={visibilityOptions}
            onChange={(e) => {
              setVisibility(e.target.value as DocumentVisibility);
            }}
          />
        </Field>
        {visibility === 'team' ? (
          <Field label="Team" htmlFor="doc-team">
            <Select
              id="doc-team"
              value={teamId}
              options={teamOptions}
              onChange={(e) => {
                setTeamId(e.target.value);
              }}
            />
          </Field>
        ) : null}
        {error !== null ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
