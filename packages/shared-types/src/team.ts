export interface TeamResponseDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamRequestDto {
  name: string;
  description?: string;
  leaderId?: string;
}

export interface UpdateTeamRequestDto {
  name?: string;
  description?: string | null;
  leaderId?: string | null;
}
