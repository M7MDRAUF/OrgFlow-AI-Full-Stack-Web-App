export const ANNOUNCEMENT_TARGET_TYPES = ['organization', 'team', 'user'] as const;
export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPES)[number];

export interface AnnouncementResponseDto {
  id: string;
  organizationId: string;
  createdBy: string;
  targetType: AnnouncementTargetType;
  targetId: string;
  title: string;
  body: string;
  readByCurrentUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementRequestDto {
  targetType: AnnouncementTargetType;
  targetId: string;
  title: string;
  body: string;
}

export interface UpdateAnnouncementRequestDto {
  title?: string;
  body?: string;
}
