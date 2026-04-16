// Route config. Leaf pages get expanded in later milestones; for now they
// render lightweight placeholders so the shell is navigable end-to-end.
import type { JSX } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layout.js';
import { AuthGuard, RoleGuard } from '../features/auth/AuthGuard.js';
import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { ActivatePage } from '../features/auth/pages/ActivatePage.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { TasksPage } from '../features/tasks/TasksPage.js';
import { KanbanPage } from '../features/tasks/KanbanPage.js';
import { ProjectsPage } from '../features/projects/ProjectsPage.js';
import { TeamsPage } from '../features/teams/TeamsPage.js';
import { UsersPage } from '../features/users/UsersPage.js';
import { AnnouncementsPage } from '../features/announcements/AnnouncementsPage.js';
import { AssistantPage } from '../features/ai/AssistantPage.js';

export function AppRoutes(): JSX.Element {
  return (
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
        <Route
          path="projects"
          element={
            <RoleGuard minRole="leader">
              <ProjectsPage />
            </RoleGuard>
          }
        />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
