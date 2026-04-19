import type { ProjectStatus } from '@orgflow/shared-types';
import { Badge, Card, ErrorState, Skeleton } from '@orgflow/ui';
import type { JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUsers } from '../users/useUsers.js';
import { useProject } from './useProjects.js';

const statusTone: Record<ProjectStatus, 'default' | 'info' | 'success' | 'warning'> = {
  planned: 'warning',
  active: 'info',
  completed: 'success',
  archived: 'default',
};

function formatDate(iso: string | null): string {
  if (iso === null) return '—';
  return new Date(iso).toLocaleDateString();
}

export function ProjectDetailPage(): JSX.Element {
  const { projectId } = useParams<{ projectId: string }>();
  const projectQuery = useProject(projectId);
  const usersQuery = useUsers();

  if (projectQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <ErrorState
        title="Project not found"
        description={projectQuery.error?.message ?? 'The requested project could not be loaded.'}
      />
    );
  }

  const project = projectQuery.data;
  const userMap = new Map((usersQuery.data ?? []).map((u) => [u.id, u.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
          &larr; Projects
        </Link>
      </div>

      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{project.title}</h1>
          <Badge tone={statusTone[project.status]}>{project.status}</Badge>
        </div>
        {project.description !== null && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Dates</h2>
          <dl className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <div className="flex justify-between">
              <dt>Start</dt>
              <dd>{formatDate(project.startDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Due</dt>
              <dd>{formatDate(project.dueDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Created</dt>
              <dd>{formatDate(project.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Members ({project.memberIds.length})
          </h2>
          {project.memberIds.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No members assigned.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {project.memberIds.map((uid) => (
                <li key={uid}>{userMap.get(uid) ?? uid}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
