// Central router. Domain modules register here during later milestones.
// Each module exports a router from its `*.routes.ts`. Keep this file small.
import { Router } from 'express';
import { sendSuccess } from '../utils/response.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { createUsersRouter } from '../modules/users/user.routes.js';
import { createTeamsRouter } from '../modules/teams/team.routes.js';
import { createProjectsRouter } from '../modules/projects/project.routes.js';
import { createTasksRouter } from '../modules/tasks/task.routes.js';
import { createDashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { createAnnouncementsRouter } from '../modules/announcements/announcement.routes.js';
import { createDocumentsRouter } from '../modules/ai/documents/document.routes.js';

export function createApiRouter(): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    sendSuccess(res, { name: 'orgflow-ai', version: '0.1.0' });
  });
  router.use('/auth', createAuthRouter());
  router.use('/users', createUsersRouter());
  router.use('/teams', createTeamsRouter());
  router.use('/projects', createProjectsRouter());
  router.use('/tasks', createTasksRouter());
  router.use('/dashboard', createDashboardRouter());
  router.use('/announcements', createAnnouncementsRouter());
  router.use('/ai/documents', createDocumentsRouter());
  return router;
}
