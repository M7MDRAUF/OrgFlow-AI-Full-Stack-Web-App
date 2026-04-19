export interface OrganizationResponseDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationRequestDto {
  name?: string;
}
