// notes-agent — announcement model with read-state tracking.
import type { AnnouncementTargetType } from '@orgflow/shared-types';
import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface AnnouncementDoc {
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  targetType: AnnouncementTargetType;
  targetId: Types.ObjectId;
  title: string;
  body: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<AnnouncementDoc>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['organization', 'team', 'user'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    // TODO(BUG-003): readBy is an unbounded array. Acceptable at university
    // scale (<5 000 users per org). If the platform grows beyond that, migrate
    // to a separate AnnouncementRead collection with { announcementId, userId }.
    readBy: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true },
);

announcementSchema.index({ organizationId: 1, targetType: 1, targetId: 1, createdAt: -1 });

export type AnnouncementModelType = Model<AnnouncementDoc>;
export type AnnouncementHydrated = HydratedDocument<AnnouncementDoc>;

export const AnnouncementModel = model<AnnouncementDoc>('Announcement', announcementSchema);
