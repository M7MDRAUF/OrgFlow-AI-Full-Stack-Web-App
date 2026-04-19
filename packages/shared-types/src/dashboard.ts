// dashboard-agent — shared dashboard DTOs.
import type { ProjectStatus } from './project.js';
import type { TaskPriority, TaskStatus } from './task.js';

export interface DashboardStats {
  teams: number;
  users: number;
  projects: number;
  tasks: number;
  tasksOverdue: number;
  tasksDone: number;
  tasksInProgress: number;
  tasksTodo: number;
}

export interface TaskStatusBreakdown {
  todo: number;
  inProgress: number;
  done: number;
}

export interface DashboardProjectSummary {
  id: string;
  title: string;
  teamId: string;
  status: ProjectStatus;
  taskCount: number;
  overdueCount: number;
}

export interface AdminDashboardResponseDto {
  scope: 'admin';
  stats: DashboardStats;
  byTeam: {
    teamId: string;
    teamName: string;
    projectCount: number;
    taskCount: number;
    overdueCount: number;
  }[];
}

export interface LeaderDashboardResponseDto {
  scope: 'leader';
  teamId: string;
  stats: DashboardStats;
  projects: DashboardProjectSummary[];
}

export interface MemberDashboardResponseDto {
  scope: 'member';
  stats: {
    assignedTotal: number;
    assignedOverdue: number;
    assignedDone: number;
    assignedInProgress: number;
    assignedTodo: number;
  };
  upcoming: {
    id: string;
    title: string;
    projectId: string;
    dueDate: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    overdue: boolean;
  }[];
}

export type DashboardResponseDto =
  | AdminDashboardResponseDto
  | LeaderDashboardResponseDto
  | MemberDashboardResponseDto;
