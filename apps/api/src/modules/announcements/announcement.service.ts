// notes-agent — announcements with targeting (organization/team/user) and read-state.
import type { AnnouncementResponseDto, UnreadCountDto } from '@orgflow/shared-types';
import { Types } from 'mongoose';
import type { AuthContext } from '../../middleware/auth-context.js';
import { logAudit } from '../../utils/audit.js';
import { errors } from '../../utils/errors.js';
import { toSkipLimit, type Pagination } from '../../utils/pagination.js';
import { TeamModel } from '../teams/team.model.js';
import { UserModel } from '../users/user.model.js';
import { AnnouncementModel, type AnnouncementHydrated } from './announcement.model.js';
import type {
  CreateAnnouncementInput,
  ListAnnouncementsQuery,
  UpdateAnnouncementInput,
} from './announcement.schema.js';

function assertObjectId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw errors.validation(`Invalid ${label}`);
  return new Types.ObjectId(id);
}

function toDto(doc: AnnouncementHydrated, userId: Types.ObjectId): AnnouncementResponseDto {
  const readByCurrentUser = doc.readBy.some((id) => id.equals(userId));
  return {
    id: doc.id as string,
    organizationId: doc.organizationId.toString(),
    createdBy: doc.createdBy.toString(),
    targetType: doc.targetType,
    targetId: doc.targetId.toString(),
    title: doc.title,
    body: doc.body,
    readByCurrentUser,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function assertTargetExists(
  orgId: Types.ObjectId,
  targetType: 'organization' | 'team' | 'user',
  targetId: Types.ObjectId,
): Promise<void> {
  if (targetType === 'organization') {
    if (!targetId.equals(orgId)) throw errors.validation('Organization target must match your org');
    return;
  }
  if (targetType === 'team') {
    const team = await TeamModel.findOne({ _id: targetId, organizationId: orgId });
    if (!team) throw errors.notFound('Team not found');
    return;
  }
  const user = await UserModel.findOne({ _id: targetId, organizationId: orgId });
  if (!user) throw errors.notFound('User not found');
}

function assertCanCreate(
  auth: AuthContext,
  targetType: 'organization' | 'team' | 'user',
  targetId: Types.ObjectId,
): void {
  if (auth.role === 'admin') return;
  if (auth.role === 'leader') {
    if (targetType === 'organization') {
      throw errors.forbidden('Leaders cannot post organization-wide announcements');
    }
    if (auth.teamId === null) throw errors.forbidden('Leader has no team assigned');
    if (targetType === 'team' && targetId.toString() !== auth.teamId) {
      throw errors.forbidden('Leaders can only post to their own team');
    }
    return;
  }
  throw errors.forbidden('Members cannot create announcements');
}

export async function listAnnouncements(
  auth: AuthContext,
  query: ListAnnouncementsQuery,
  pagination: Pagination,
): Promise<{ items: AnnouncementResponseDto[]; total: number }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);

  const filter: Record<string, unknown> = { organizationId: orgId };

  // Admins see all announcements in their org; others are scoped by target.
  if (auth.role !== 'admin') {
    const targetClauses: Record<string, unknown>[] = [
      { targetType: 'organization', targetId: orgId },
      { targetType: 'user', targetId: userId },
    ];
    if (auth.teamId !== null) {
      targetClauses.push({
        targetType: 'team',
        targetId: new Types.ObjectId(auth.teamId),
      });
    }
    filter['$or'] = targetClauses;
  }
  if (query.unreadOnly) {
    filter['readBy'] = { $ne: userId };
  }

  const { skip, limit } = toSkipLimit(pagination);
  const [docs, total] = await Promise.all([
    AnnouncementModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AnnouncementModel.countDocuments(filter),
  ]);
  return { items: docs.map((d) => toDto(d, userId)), total };
}

export async function getAnnouncement(
  auth: AuthContext,
  id: string,
): Promise<AnnouncementResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);
  const announcementId = assertObjectId(id, 'announcement id');
  const doc = await AnnouncementModel.findOne({ _id: announcementId, organizationId: orgId });
  if (!doc) throw errors.notFound('Announcement not found');
  assertCanView(auth, doc);
  return toDto(doc, userId);
}

function assertCanView(auth: AuthContext, doc: AnnouncementHydrated): void {
  // Admins can view any announcement within their organization.
  if (auth.role === 'admin') return;
  if (doc.targetType === 'organization') return;
  if (doc.targetType === 'team') {
    if (auth.teamId === null || doc.targetId.toString() !== auth.teamId) {
      throw errors.forbidden('Not in announcement target team');
    }
    return;
  }
  if (doc.targetId.toString() !== auth.userId) {
    throw errors.forbidden('Announcement not addressed to you');
  }
}

export async function createAnnouncement(
  auth: AuthContext,
  input: CreateAnnouncementInput,
): Promise<AnnouncementResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);
  const targetId = assertObjectId(input.targetId, 'target id');
  assertCanCreate(auth, input.targetType, targetId);
  await assertTargetExists(orgId, input.targetType, targetId);

  const doc = await AnnouncementModel.create({
    organizationId: orgId,
    createdBy: userId,
    targetType: input.targetType,
    targetId,
    title: input.title,
    body: input.body,
    readBy: [userId],
  });
  logAudit(auth, {
    action: 'announcement.create',
    resourceId: doc.id as string,
    meta: { announcementId: doc.id as string, title: doc.title },
  });
  return toDto(doc, userId);
}

export async function updateAnnouncement(
  auth: AuthContext,
  id: string,
  input: UpdateAnnouncementInput,
): Promise<AnnouncementResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);
  const announcementId = assertObjectId(id, 'announcement id');
  const doc = await AnnouncementModel.findOne({ _id: announcementId, organizationId: orgId });
  if (!doc) throw errors.notFound('Announcement not found');
  if (auth.role !== 'admin' && doc.createdBy.toString() !== auth.userId) {
    throw errors.forbidden('Only the author or an admin can edit this announcement');
  }
  if (input.title !== undefined) doc.title = input.title;
  if (input.body !== undefined) doc.body = input.body;
  await doc.save();
  logAudit(auth, {
    action: 'announcement.update',
    resourceId: doc.id as string,
    meta: { announcementId: doc.id as string },
  });
  return toDto(doc, userId);
}

export async function deleteAnnouncement(
  auth: AuthContext,
  id: string,
): Promise<{ deleted: true }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const announcementId = assertObjectId(id, 'announcement id');
  const doc = await AnnouncementModel.findOne({ _id: announcementId, organizationId: orgId });
  if (!doc) throw errors.notFound('Announcement not found');
  if (auth.role !== 'admin' && doc.createdBy.toString() !== auth.userId) {
    throw errors.forbidden('Only the author or an admin can delete this announcement');
  }
  await doc.deleteOne();
  logAudit(auth, {
    action: 'announcement.delete',
    resourceId: doc.id as string,
    meta: { announcementId: doc.id as string },
  });
  return { deleted: true };
}

export async function markAnnouncementRead(
  auth: AuthContext,
  id: string,
): Promise<AnnouncementResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);
  const announcementId = assertObjectId(id, 'announcement id');
  const doc = await AnnouncementModel.findOne({ _id: announcementId, organizationId: orgId });
  if (!doc) throw errors.notFound('Announcement not found');
  assertCanView(auth, doc);
  // Atomic $addToSet avoids TOCTOU race when concurrent requests mark the
  // same announcement as read — no duplicate entries possible.
  await AnnouncementModel.updateOne({ _id: announcementId }, { $addToSet: { readBy: userId } });
  // Re-read to return fresh state (readBy now guaranteed to include userId).
  const updated = await AnnouncementModel.findById(announcementId);
  if (!updated) throw errors.notFound('Announcement not found');
  return toDto(updated, userId);
}

export async function getUnreadCount(auth: AuthContext): Promise<UnreadCountDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);

  const filter: Record<string, unknown> = {
    organizationId: orgId,
    readBy: { $ne: userId },
  };

  // Admins see all; others scoped by target.
  if (auth.role !== 'admin') {
    const targetClauses: Record<string, unknown>[] = [
      { targetType: 'organization', targetId: orgId },
      { targetType: 'user', targetId: userId },
    ];
    if (auth.teamId !== null) {
      targetClauses.push({
        targetType: 'team',
        targetId: new Types.ObjectId(auth.teamId),
      });
    }
    filter['$or'] = targetClauses;
  }

  const count = await AnnouncementModel.countDocuments(filter);

  return { count };
}
