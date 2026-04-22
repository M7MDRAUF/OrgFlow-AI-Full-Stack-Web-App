// rag-chat-agent — clearHistory must delete ONLY the calling user's logs in
// their organization. Other users in the same org and the same userId in a
// different org must be untouched.
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { ChatLogModel } from '../src/modules/ai/chat/chat-log.model.js';
import { clearHistory, getHistory } from '../src/modules/ai/chat/chat.service.js';
import './setup-db.js';

const ORG_1 = new Types.ObjectId();
const ORG_2 = new Types.ObjectId();
const USER_A = new Types.ObjectId();
const USER_B = new Types.ObjectId();

function auth(org: Types.ObjectId, user: Types.ObjectId): AuthContext {
  return {
    userId: user.toString(),
    organizationId: org.toString(),
    teamId: null,
    role: 'member',
  };
}

describe('clearHistory scope', () => {
  beforeEach(async () => {
    await ChatLogModel.deleteMany({});
    await ChatLogModel.create([
      { organizationId: ORG_1, userId: USER_A, role: 'user', content: 'A1', sources: [] },
      { organizationId: ORG_1, userId: USER_A, role: 'assistant', content: 'A1r', sources: [] },
      { organizationId: ORG_1, userId: USER_B, role: 'user', content: 'B1', sources: [] },
      { organizationId: ORG_2, userId: USER_A, role: 'user', content: 'cross-org', sources: [] },
    ]);
  });

  it('deletes only the calling user logs and reports the count', async () => {
    const result = await clearHistory(auth(ORG_1, USER_A));
    expect(result.deleted).toBe(2);

    const { messages: aHistory } = await getHistory(auth(ORG_1, USER_A));
    expect(aHistory).toHaveLength(0);

    const { messages: bHistory } = await getHistory(auth(ORG_1, USER_B));
    expect(bHistory.map((m) => m.content)).toStrictEqual(['B1']);

    const { messages: crossOrg } = await getHistory(auth(ORG_2, USER_A));
    expect(crossOrg.map((m) => m.content)).toStrictEqual(['cross-org']);
  });

  it('returns deleted=0 when there is nothing to clear', async () => {
    await clearHistory(auth(ORG_1, USER_A));
    const second = await clearHistory(auth(ORG_1, USER_A));
    expect(second.deleted).toBe(0);
  });
});
