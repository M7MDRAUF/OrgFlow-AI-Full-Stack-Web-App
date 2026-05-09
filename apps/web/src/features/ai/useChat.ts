// rag-chat-agent — React hooks for the assistant chat feature.
import type {
  ChatAnswerPayload,
  ChatHistoryMessageDto,
  ChatRequestDto,
  OllamaConnectionStatus,
  OllamaHealthResponse,
} from '@orgflow/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';

// G-003: validate source citations at the frontend boundary so we never render
// malformed data even if the API response is unexpected.
const citationSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  chunkIndex: z.number(),
});
const safeCitations = z.array(citationSchema).catch([]);

export function useOllamaStatus(): {
  status: OllamaConnectionStatus | 'checking';
} {
  const query = useQuery<OllamaHealthResponse>({
    queryKey: QUERY_KEYS.ollamaHealth,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{ success: true; data: OllamaHealthResponse }>(
        '/ai/chat/health',
        { signal },
      );
      return res.data.data;
    },
    refetchInterval: 30_000,
    retry: false,
  });

  if (query.isLoading) return { status: 'checking' };
  return { status: query.data?.status ?? 'disconnected' };
}

export function useChatHistory(): ReturnType<typeof useQuery<ChatHistoryMessageDto[]>> {
  return useQuery<ChatHistoryMessageDto[]>({
    queryKey: QUERY_KEYS.chatHistory,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{
        success: true;
        data: { messages: ChatHistoryMessageDto[] };
      }>('/ai/chat/history', { signal });
      return res.data.data.messages.map((m) => ({
        ...m,
        sources: safeCitations.parse(m.sources),
      }));
    },
  });
}

export function useAskAssistant(): ReturnType<
  typeof useMutation<ChatAnswerPayload, Error, ChatRequestDto>
> {
  const qc = useQueryClient();
  return useMutation<ChatAnswerPayload, Error, ChatRequestDto>({
    mutationFn: async (input) => {
      // AI inference (cold model load + retrieval + generation) routinely
      // exceeds the global 30s axios default. Override per-call to 120s so
      // first-token latency on Ollama doesn't surface as a generic timeout
      // toast that hides the real (still-running) request.
      const res = await apiClient.post<{ success: true; data: ChatAnswerPayload }>(
        '/ai/chat',
        input,
        { timeout: 120_000 },
      );
      const payload = res.data.data;
      return { ...payload, sources: safeCitations.parse(payload.sources) };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.chatHistory });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}

// rag-chat-agent — per-user chat clear. Calls DELETE /ai/chat/history; the
// backend scopes the deletion to {organizationId, userId}, so this only ever
// removes the calling user's own messages.
export function useClearChat(): ReturnType<typeof useMutation<{ deleted: number }, Error>> {
  const qc = useQueryClient();
  return useMutation<{ deleted: number }>({
    mutationFn: async () => {
      const res = await apiClient.delete<{ success: true; data: { deleted: number } }>(
        '/ai/chat/history',
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.setQueryData<ChatHistoryMessageDto[]>(QUERY_KEYS.chatHistory, []);
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.chatHistory });
      toast.success(
        data.deleted > 0
          ? `Cleared ${String(data.deleted)} message${data.deleted === 1 ? '' : 's'}`
          : 'Chat already empty',
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to clear chat');
    },
  });
}
