export const PROJECT_STATUSES = ['planned', 'active', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectResponseDto {
  id: string;
  organizationId: string;
  teamId: string;
  title: string;
  description: string | null;
  createdBy: string;
  memberIds: string[];
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequestDto {
  teamId: string;
  title: string;
  description?: string;
  memberIds?: string[];
  status?: ProjectStatus;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateProjectRequestDto {
  title?: string;
  description?: string | null;
  memberIds?: string[];
  status?: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
}
