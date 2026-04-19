// org-agent — Organization service. Org is a tenant boundary derived from JWT.
// Only "current org" endpoints exposed; no multi-org listing.
import type { OrganizationResponseDto } from '@orgflow/shared-types';
import { Types } from 'mongoose';
import type { AuthContext } from '../../middleware/auth-context.js';
import { logAudit } from '../../utils/audit.js';
import { errors } from '../../utils/errors.js';
import { OrganizationModel, type OrganizationHydrated } from './organization.model.js';
import type { UpdateOrganizationInput } from './organization.schema.js';

function toDto(doc: OrganizationHydrated): OrganizationResponseDto {
  return {
    id: doc.id as string,
    name: doc.name,
    slug: doc.slug,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function getCurrentOrganization(auth: AuthContext): Promise<OrganizationResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const org = await OrganizationModel.findById(orgId);
  if (!org) throw errors.notFound('Organization not found');
  return toDto(org);
}

export async function updateCurrentOrganization(
  auth: AuthContext,
  input: UpdateOrganizationInput,
): Promise<OrganizationResponseDto> {
  if (auth.role !== 'admin') {
    throw errors.forbidden('Only admins can update the organization');
  }
  const orgId = new Types.ObjectId(auth.organizationId);
  const org = await OrganizationModel.findById(orgId);
  if (!org) throw errors.notFound('Organization not found');

  if (input.name !== undefined) org.name = input.name;
  await org.save();
  logAudit(auth, {
    action: 'organization.update',
    resourceId: org.id as string,
    meta: { organizationId: org.id as string },
  });
  return toDto(org);
}
