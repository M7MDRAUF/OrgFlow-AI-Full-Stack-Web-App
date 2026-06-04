// Project model — scoped to organization + team. Tracks members, status, dates.
import type { ProjectStatus } from '@orgflow/shared-types';
import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface ProjectDoc {
  organizationId: Types.ObjectId;
  teamId: Types.ObjectId;
  title: string;
  description: string | null;
  createdBy: Types.ObjectId;
  memberIds: Types.ObjectId[];
  status: ProjectStatus;
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDoc>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['planned', 'active', 'completed', 'archived'],
      default: 'planned',
      required: true,
    },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true },
);

projectSchema.index({ organizationId: 1, teamId: 1, title: 1 });
projectSchema.index({ organizationId: 1, teamId: 1, status: 1 });

export const ProjectModel: Model<ProjectDoc> = model<ProjectDoc>('Project', projectSchema);
export type ProjectHydrated = HydratedDocument<ProjectDoc>;
