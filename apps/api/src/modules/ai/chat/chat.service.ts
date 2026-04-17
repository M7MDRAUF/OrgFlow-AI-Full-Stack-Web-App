// rag-chat-agent — Chat service: retrieves grounded context, calls Ollama chat,
// returns answer + source citations. Falls back to an extractive answer from the
// top retrieved chunk if the LLM is unreachable. All answers remain grounded.
import { Types } from 'mongoose';
import type {
  AiSourceCitation,
  ChatAnswerPayload,
  ChatHistoryMessageDto,
} from '@orgflow/shared-types';
import { loadEnv } from '../../../app/env.js';
import { errors } from '../../../utils/errors.js';
import type { AuthContext } from '../../../middleware/auth-context.js';
import { retrieveChunks, type RetrievedChunk } from '../retrieval.js';
import { ChatLogModel } from './chat-log.model.js';
import type { ChatRequestInput } from './chat.schema.js';

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  message?: { content?: string };
}

function buildPrompt(question: string, chunks: RetrievedChunk[]): OllamaChatMessage[] {
  const contextBlock = chunks
    .map(
      (c, i) =>
        `[${String(i + 1)}] ${c.documentTitle} (chunk ${String(c.chunkIndex)}):\n${c.content}`,
    )
    .join('\n\n');
  const system = [
    'You are the OrgFlow internal assistant.',
    'Answer strictly using the provided context. If the context does not contain the answer, reply:',
    '"I could not find this in the available documents."',
    'Never invent policies or facts. Cite sources as [1], [2], etc.',
  ].join(' ');
  const user = `Question: ${question}\n\nContext:\n${contextBlock}`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

async function callOllamaChat(messages: OllamaChatMessage[]): Promise<string | null> {
  const env = loadEnv();
  try {
    const response = await fetch(`${env.OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.OLLAMA_CHAT_MODEL, messages, stream: false }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as OllamaChatResponse;
    const content = data.message?.content;
    return typeof content === 'string' && content.length > 0 ? content : null;
  } catch {
    return null;
  }
}

function extractiveFallback(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return 'I could not find this in the available documents.';
  const top = chunks[0];
  if (!top) return 'I could not find this in the available documents.';
  const snippet = top.content.slice(0, 600);
  return `Based on [1] ${top.documentTitle}:\n\n${snippet}`;
}

function toCitations(chunks: RetrievedChunk[]): AiSourceCitation[] {
  return chunks.map((c) => ({
    documentId: c.documentId,
    title: c.documentTitle,
    chunkIndex: c.chunkIndex,
  }));
}

export async function askQuestion(
  auth: AuthContext,
  input: ChatRequestInput,
): Promise<ChatAnswerPayload> {
  if (input.question.length === 0) throw errors.validation('Question is required');
  const started = Date.now();

  const scope: Parameters<typeof retrieveChunks>[2] = {};
  if (input.teamId !== undefined) scope.teamId = input.teamId;
  if (input.projectId !== undefined) scope.projectId = input.projectId;
  const chunks = await retrieveChunks(auth, input.question, scope, 5);

  let answer: string;
  if (chunks.length === 0) {
    answer = 'I could not find this in the available documents.';
  } else {
    const llmAnswer = await callOllamaChat(buildPrompt(input.question, chunks));
    answer = llmAnswer ?? extractiveFallback(chunks);
  }

  const sources = toCitations(chunks);
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);
  await ChatLogModel.create([
    { organizationId: orgId, userId, role: 'user', content: input.question, sources: [] },
    { organizationId: orgId, userId, role: 'assistant', content: answer, sources },
  ]);

  return { answer, sources, durationMs: Date.now() - started };
}

export async function getHistory(auth: AuthContext): Promise<ChatHistoryMessageDto[]> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const userId = new Types.ObjectId(auth.userId);
  const logs = await ChatLogModel.find({ organizationId: orgId, userId })
    .sort({ createdAt: 1 })
    .limit(100);
  return logs.map((l) => ({
    id: l.id as string,
    role: l.role,
    content: l.content,
    sources: l.sources,
    createdAt: l.createdAt.toISOString(),
  }));
}
