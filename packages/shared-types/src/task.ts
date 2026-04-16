export const TASK_STATUSES = ['todo', 'in-progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface TaskResponseDto {
  id: string;
  organizationId: string;
  teamId: string;
  projectId: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCommentResponseDto {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequestDto {
  projectId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskRequestDto {
  title?: string;
  description?: string | null;
  assignedTo?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  status?: TaskStatus;
}
