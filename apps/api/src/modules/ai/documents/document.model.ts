// rag-ingest-agent — Document metadata model (per-file record).
import type { DocumentStatus, DocumentVisibility, UserRole } from '@orgflow/shared-types';
import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface DocumentDoc {
  organizationId: Types.ObjectId;
  teamId: Types.ObjectId | null;
  projectId: Types.ObjectId | null;
  visibility: DocumentVisibility;
  title: string;
  originalFilename: string;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  status: DocumentStatus;
  allowedRoles: UserRole[];
  chunkCount: number | null;
  rawText: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<DocumentDoc>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    visibility: {
      type: String,
      enum: ['organization', 'team', 'project'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['uploaded', 'parsed', 'indexed', 'failed'],
      default: 'uploaded',
    },
    allowedRoles: {
      type: [String],
      enum: ['admin', 'leader', 'member'],
      default: [],
    },
    chunkCount: { type: Number, default: null },
    rawText: { type: String, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

documentSchema.index({ organizationId: 1, visibility: 1, teamId: 1, projectId: 1 });

export type DocumentModelType = Model<DocumentDoc>;
export type DocumentHydrated = HydratedDocument<DocumentDoc>;

export const DocumentModel = model<DocumentDoc>('Document', documentSchema);
