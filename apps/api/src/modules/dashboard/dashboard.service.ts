// dashboard-agent — aggregation service. Reads only; never mutates domain state.
import type {
  AdminDashboardResponseDto,
  DashboardResponseDto,
  LeaderDashboardResponseDto,
  MemberDashboardResponseDto,
} from '@orgflow/shared-types';
import { Types } from 'mongoose';
import type { AuthContext } from '../../middleware/auth-context.js';
import { ProjectModel } from '../projects/project.model.js';
import { TaskModel, type TaskDoc } from '../tasks/task.model.js';
import { TeamModel } from '../teams/team.model.js';
import { UserModel } from '../users/user.model.js';

interface TaskAggregate {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

async function aggregateTasks(match: Record<string, unknown>, now: Date): Promise<TaskAggregate> {
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
  // F-005: capture `now` ONCE per dashboard request so every overdue
  // computation inside this boundary agrees. Fan-out queries otherwise drift
  // by tens of ms and can produce inconsistent overdue totals.
  const now = new Date();
  const orgId = new Types.ObjectId(auth.organizationId);
  const match = { organizationId: orgId };
  const [teams, users, projects, taskAgg] = await Promise.all([
    TeamModel.countDocuments(match),
    UserModel.countDocuments(match),
    ProjectModel.countDocuments(match),
    aggregateTasks(match, now),
  ]);

  const teamsList = await TeamModel.find(match).sort({ name: 1 }).limit(50);
  const teamIds = teamsList.map((t) => t._id);

  // N+1 fix: batch-aggregate project/task/overdue counts per team in 3 queries
  // instead of 3 × N sequential countDocuments calls.
  const [projectsByTeam, tasksByTeam, overdueByTeam] = await Promise.all([
    ProjectModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { organizationId: orgId, teamId: { $in: teamIds } } },
      { $group: { _id: '$teamId', count: { $sum: 1 } } },
    ]),
    TaskModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { organizationId: orgId, teamId: { $in: teamIds } } },
      { $group: { _id: '$teamId', count: { $sum: 1 } } },
    ]),
    TaskModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          organizationId: orgId,
          teamId: { $in: teamIds },
          status: { $ne: 'done' },
          dueDate: { $ne: null, $lt: now },
        },
      },
      { $group: { _id: '$teamId', count: { $sum: 1 } } },
    ]),
  ]);

  const projectMap = new Map(projectsByTeam.map((r) => [r._id.toString(), r.count]));
  const taskMap = new Map(tasksByTeam.map((r) => [r._id.toString(), r.count]));
  const overdueMap = new Map(overdueByTeam.map((r) => [r._id.toString(), r.count]));

  const byTeam = teamsList.map((t) => {
    const tid = t._id.toString();
    return {
      teamId: tid,
      teamName: t.name,
      projectCount: projectMap.get(tid) ?? 0,
      taskCount: taskMap.get(tid) ?? 0,
      overdueCount: overdueMap.get(tid) ?? 0,
    };
  });

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
  // F-005: single `now` across all queries in this request.
  const now = new Date();
  const [users, projects, taskAgg] = await Promise.all([
    UserModel.countDocuments(match),
    ProjectModel.countDocuments(match),
    aggregateTasks(match, now),
  ]);

  const projectDocs = await ProjectModel.find(match).sort({ updatedAt: -1 }).limit(20);
  const projectIds = projectDocs.map((p) => p._id);

  // N+1 fix: batch-aggregate task/overdue counts per project in 2 queries.
  const [tasksByProject, overdueByProject] = await Promise.all([
    TaskModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { organizationId: orgId, projectId: { $in: projectIds } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]),
    TaskModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          organizationId: orgId,
          projectId: { $in: projectIds },
          status: { $ne: 'done' },
          dueDate: { $ne: null, $lt: now },
        },
      },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]),
  ]);

  const taskMap = new Map(tasksByProject.map((r) => [r._id.toString(), r.count]));
  const overdueMap = new Map(overdueByProject.map((r) => [r._id.toString(), r.count]));

  const projectsSummary = projectDocs.map((p) => {
    const pid = p._id.toString();
    return {
      id: pid,
      title: p.title,
      teamId: p.teamId.toString(),
      status: p.status,
      taskCount: taskMap.get(pid) ?? 0,
      overdueCount: overdueMap.get(pid) ?? 0,
    };
  });

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
  // F-005: single `now` shared by aggregate + per-task overdue flag.
  const now = new Date();
  const taskAgg = await aggregateTasks(match, now);

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
