// rag-chat-agent — H14 regression. `getHistory` must filter chat logs by
// {organizationId, userId}. We seed three chat logs across (org, user) pairs
// and confirm each auth context sees exactly its own.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { ChatLogModel } from '../src/modules/ai/chat/chat-log.model.js';
import { getHistory } from '../src/modules/ai/chat/chat.service.js';
import './setup-db.js';

const ORG_1 = new Types.ObjectId();
const ORG_2 = new Types.ObjectId();
const USER_A = new Types.ObjectId();
const USER_B = new Types.ObjectId();
const USER_C = new Types.ObjectId(); // org 2

beforeAll(async () => {
  await ChatLogModel.create([
    { organizationId: ORG_1, userId: USER_A, role: 'user', content: 'A1', sources: [] },
    { organizationId: ORG_1, userId: USER_A, role: 'assistant', content: 'A1r', sources: [] },
    { organizationId: ORG_1, userId: USER_B, role: 'user', content: 'B1', sources: [] },
    { organizationId: ORG_2, userId: USER_C, role: 'user', content: 'C1', sources: [] },
    // Edge case: same userId as A but in a different org — must NOT leak.
    { organizationId: ORG_2, userId: USER_A, role: 'user', content: 'Across-org', sources: [] },
  ]);
});

function auth(org: Types.ObjectId, user: Types.ObjectId): AuthContext {
  return {
    userId: user.toString(),
    organizationId: org.toString(),
    teamId: null,
    role: 'member',
  };
}

describe('getHistory scope (H14)', () => {
  it('returns only logs for the exact {org, user} pair', async () => {
    const { messages: aHistory } = await getHistory(auth(ORG_1, USER_A));
    expect(aHistory.map((m) => m.content).sort()).toStrictEqual(['A1', 'A1r']);

    const { messages: bHistory } = await getHistory(auth(ORG_1, USER_B));
    expect(bHistory.map((m) => m.content)).toStrictEqual(['B1']);
  });

  it('does not leak across organizations even when userId matches', async () => {
    const { messages: aHistory } = await getHistory(auth(ORG_1, USER_A));
    expect(aHistory.map((m) => m.content)).not.toContain('Across-org');
    const { messages: crossHistory } = await getHistory(auth(ORG_2, USER_A));
    expect(crossHistory.map((m) => m.content)).toStrictEqual(['Across-org']);
  });

  it('returns empty for a user with no chat history', async () => {
    const { messages: history } = await getHistory(auth(ORG_1, new Types.ObjectId()));
    expect(history).toStrictEqual([]);
  });
});
