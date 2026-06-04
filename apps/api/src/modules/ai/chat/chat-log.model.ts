// rag-chat-agent — Chat log model (user + assistant messages with citations).
import type { AiSourceCitation } from '@orgflow/shared-types';
import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';
import { loadEnv } from '../../../app/env.js';

export interface ChatLogDoc {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  teamId: Types.ObjectId | null;
  role: 'user' | 'assistant';
  content: string;
  sources: AiSourceCitation[];
  createdAt: Date;
  updatedAt: Date;
}

const chatLogSchema = new Schema<ChatLogDoc>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: {
      type: [
        {
          _id: false,
          documentId: { type: String, required: true },
          title: { type: String, required: true },
          chunkIndex: { type: Number, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

chatLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

export type ChatLogModelType = Model<ChatLogDoc>;
export type ChatLogHydrated = HydratedDocument<ChatLogDoc>;

export const ChatLogModel = model<ChatLogDoc>('ChatLog', chatLogSchema);

// DB-02: bound chat history growth with a lazy TTL index instead of calling
// loadEnv() at module load time — env vars may not be ready or may mutate
// in tests. Call ensureChatLogTtlIndex() explicitly during app startup.
let ttlIndexEnsured = false;

export async function ensureChatLogTtlIndex(): Promise<void> {
  if (ttlIndexEnsured) return;
  const ttlDays = loadEnv().CHAT_LOG_TTL_DAYS;
  if (ttlDays > 0) {
    const expireAfterSeconds = ttlDays * 24 * 60 * 60;
    await ChatLogModel.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds });
  }
  ttlIndexEnsured = true;
}
