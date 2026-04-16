// dashboard-agent — aggregation service. Reads only; never mutates domain state.
import { Types } from 'mongoose';
import type {
  AdminDashboardResponseDto,
  DashboardResponseDto,
  LeaderDashboardResponseDto,
  MemberDashboardResponseDto,
} from '@orgflow/shared-types';
import type { AuthContext } from '../../middleware/auth-context.js';
import { TaskModel, type TaskDoc } from '../tasks/task.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { TeamModel } from '../teams/team.model.js';
import { UserModel } from '../users/user.model.js';

interface TaskAggregate {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

async function aggregateTasks(match: Record<string, unknown>): Promise<TaskAggregate> {
  const now = new Date();
  const [total, todo, inProgress, done, overdue] = await Promise.all([
    TaskModel.countDocuments(match),
    TaskModel.countDocuments({ ...match, status: 'todo' }),
    TaskModel.countDocuments({ ...match, status: 'in-progress' }),
    TaskModel.countDocuments({ ...match, status: 'done' }),
    TaskModel.countDocuments({
      ...match,
      status: { $ne: 'done' },
      dueDate: { $ne: null, $lt: now },
    }),
  ]);
  return { total, todo, inProgress, done, overdue };
}

async function adminDashboard(auth: AuthContext): Promise<AdminDashboardResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const match = { organizationId: orgId };
  const [teams, users, projects, taskAgg] = await Promise.all([
    TeamModel.countDocuments(match),
    UserModel.countDocuments(match),
    ProjectModel.countDocuments(match),
    aggregateTasks(match),
  ]);

  const teamsList = await TeamModel.find(match).sort({ name: 1 }).limit(50);
  const now = new Date();
  const byTeam = await Promise.all(
    teamsList.map(async (t) => {
      const teamMatch = { organizationId: orgId, teamId: t._id };
      const [projectCount, taskCount, overdueCount] = await Promise.all([
        ProjectModel.countDocuments(teamMatch),
        TaskModel.countDocuments(teamMatch),
        TaskModel.countDocuments({
          ...teamMatch,
          status: { $ne: 'done' },
          dueDate: { $ne: null, $lt: now },
        }),
      ]);
      return {
        teamId: t._id.toString(),
        teamName: t.name,
        projectCount,
        taskCount,
        overdueCount,
      };
    }),
  );

  return {
    scope: 'admin',
    stats: {
      teams,
      users,
      projects,
      tasks: taskAgg.total,
      tasksOverdue: taskAgg.overdue,
      tasksDone: taskAgg.done,
      tasksInProgress: taskAgg.inProgress,
      tasksTodo: taskAgg.todo,
    },
    byTeam,
  };
}

async function leaderDashboard(auth: AuthContext): Promise<LeaderDashboardResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  if (auth.teamId === null) {
    return {
      scope: 'leader',
      teamId: '',
      stats: {
        teams: 0,
        users: 0,
        projects: 0,
        tasks: 0,
        tasksOverdue: 0,
        tasksDone: 0,
        tasksInProgress: 0,
        tasksTodo: 0,
      },
      projects: [],
    };
  }
  const teamId = new Types.ObjectId(auth.teamId);
  const match = { organizationId: orgId, teamId };
  const [users, projects, taskAgg] = await Promise.all([
    UserModel.countDocuments(match),
    ProjectModel.countDocuments(match),
    aggregateTasks(match),
  ]);

  const projectDocs = await ProjectModel.find(match).sort({ updatedAt: -1 }).limit(20);
  const now = new Date();
  const projectsSummary = await Promise.all(
    projectDocs.map(async (p) => {
      const pMatch = { organizationId: orgId, projectId: p._id };
      const [taskCount, overdueCount] = await Promise.all([
        TaskModel.countDocuments(pMatch),
        TaskModel.countDocuments({
          ...pMatch,
          status: { $ne: 'done' },
          dueDate: { $ne: null, $lt: now },
        }),
      ]);
      return {
        id: p._id.toString(),
        title: p.title,
        teamId: p.teamId.toString(),
        status: p.status,
        taskCount,
        overdueCount,
      };
    }),
  );

  return {
    scope: 'leader',
    teamId: auth.teamId,
    stats: {
      teams: 1,
      users,
      projects,
      tasks: taskAgg.total,
      tasksOverdue: taskAgg.overdue,
      tasksDone: taskAgg.done,
      tasksInProgress: taskAgg.inProgress,
      tasksTodo: taskAgg.todo,
    },
    projects: projectsSummary,
  };
}

async function memberDashboard(auth: AuthContext): Promise<MemberDashboardResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);
  const match: Record<string, unknown> = { organizationId: orgId, assignedTo: userId };
  const taskAgg = await aggregateTasks(match);

  const now = new Date();
  const upcomingDocs = await TaskModel.find({
    ...match,
    status: { $ne: 'done' },
  })
    .sort({ dueDate: 1, priority: -1 })
    .limit(10);

  const upcoming = upcomingDocs.map((t: TaskDoc & { _id: Types.ObjectId }) => ({
    id: t._id.toString(),
    title: t.title,
    projectId: t.projectId.toString(),
    dueDate: t.dueDate !== null ? t.dueDate.toISOString() : null,
    status: t.status,
    priority: t.priority,
    overdue: t.dueDate !== null && t.dueDate.getTime() < now.getTime() && t.status !== 'done',
  }));

  return {
    scope: 'member',
    stats: {
      assignedTotal: taskAgg.total,
      assignedOverdue: taskAgg.overdue,
      assignedDone: taskAgg.done,
      assignedInProgress: taskAgg.inProgress,
      assignedTodo: taskAgg.todo,
    },
    upcoming,
  };
}

export async function getDashboard(auth: AuthContext): Promise<DashboardResponseDto> {
  if (auth.role === 'admin') return adminDashboard(auth);
  if (auth.role === 'leader') return leaderDashboard(auth);
  return memberDashboard(auth);
}
