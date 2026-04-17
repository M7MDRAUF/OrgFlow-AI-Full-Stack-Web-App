// rag-ingest-agent — Chunk model with embedding vector + scope metadata.
import { Schema, type Types, model, type HydratedDocument, type Model } from 'mongoose';
import type { DocumentVisibility, UserRole } from '@orgflow/shared-types';

export interface DocumentChunkDoc {
  documentId: Types.ObjectId;
  organizationId: Types.ObjectId;
  teamId: Types.ObjectId | null;
  projectId: Types.ObjectId | null;
  visibility: DocumentVisibility;
  allowedRoles: UserRole[];
  chunkIndex: number;
  content: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const chunkSchema = new Schema<DocumentChunkDoc>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
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
    allowedRoles: {
      type: [String],
      enum: ['admin', 'leader', 'member'],
      default: [],
    },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true },
);

chunkSchema.index({ organizationId: 1, visibility: 1, teamId: 1, projectId: 1 });
chunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

export type DocumentChunkModelType = Model<DocumentChunkDoc>;
export type DocumentChunkHydrated = HydratedDocument<DocumentChunkDoc>;

export const DocumentChunkModel = model<DocumentChunkDoc>('DocumentChunk', chunkSchema);
