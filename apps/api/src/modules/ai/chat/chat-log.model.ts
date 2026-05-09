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

// DB-02: bound chat history growth with a Mongo TTL index. Set
// CHAT_LOG_TTL_DAYS=0 in env to disable (emit no TTL index). Mongo applies
// `expireAfterSeconds` against the indexed Date field; we use `createdAt`
// because it is monotonic and never updated by message edits.
const ttlDays = loadEnv().CHAT_LOG_TTL_DAYS;
if (ttlDays > 0) {
  chatLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: ttlDays * 24 * 60 * 60 });
}

export type ChatLogModelType = Model<ChatLogDoc>;
export type ChatLogHydrated = HydratedDocument<ChatLogDoc>;

export const ChatLogModel = model<ChatLogDoc>('ChatLog', chatLogSchema);
