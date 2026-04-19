// Route config. Leaf pages get expanded in later milestones; for now they
// render lightweight placeholders so the shell is navigable end-to-end.
import { lazy, Suspense, type JSX } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthGuard, RoleGuard } from '../features/auth/AuthGuard.js';
import { ActivatePage } from '../features/auth/pages/ActivatePage.js';
import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { AppLayout } from './layout.js';
import { NotFoundPage } from './NotFoundPage.js';

// Lazy-loaded page chunks – each produces its own bundle split.
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage.js').then((m) => ({ default: m.DashboardPage })),
);
const TasksPage = lazy(() =>
  import('../features/tasks/TasksPage.js').then((m) => ({ default: m.TasksPage })),
);
const KanbanPage = lazy(() =>
  import('../features/tasks/KanbanPage.js').then((m) => ({ default: m.KanbanPage })),
);
const ProjectsPage = lazy(() =>
  import('../features/projects/ProjectsPage.js').then((m) => ({ default: m.ProjectsPage })),
);
const ProjectDetailPage = lazy(() =>
  import('../features/projects/ProjectDetailPage.js').then((m) => ({
    default: m.ProjectDetailPage,
  })),
);
const TeamsPage = lazy(() =>
  import('../features/teams/TeamsPage.js').then((m) => ({ default: m.TeamsPage })),
);
const UsersPage = lazy(() =>
  import('../features/users/UsersPage.js').then((m) => ({ default: m.UsersPage })),
);
const AnnouncementsPage = lazy(() =>
  import('../features/announcements/AnnouncementsPage.js').then((m) => ({
    default: m.AnnouncementsPage,
  })),
);
const AssistantPage = lazy(() =>
  import('../features/ai/AssistantPage.js').then((m) => ({ default: m.AssistantPage })),
);
const KnowledgePage = lazy(() =>
  import('../features/ai/KnowledgePage.js').then((m) => ({ default: m.KnowledgePage })),
);

function PageFallback(): JSX.Element {
  return <div className="flex h-64 items-center justify-center text-slate-400">Loading…</div>;
}

export function AppRoutes(): JSX.Element {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate" element={<ActivatePage />} />
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="kanban" element={<KanbanPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="teams"
            element={
              <RoleGuard minRole="admin">
                <TeamsPage />
              </RoleGuard>
            }
          />
          <Route
            path="users"
            element={
              <RoleGuard minRole="admin">
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route
            path="knowledge"
            element={
              <RoleGuard minRole="admin">
                <KnowledgePage />
              </RoleGuard>
            }
          />
          {/* 404 inside the authenticated shell (FE-C-003). */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* Catch-all for unauthenticated, unknown paths. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
