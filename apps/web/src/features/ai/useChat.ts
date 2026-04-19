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
      const res = await apiClient.post<{ success: true; data: ChatAnswerPayload }>(
        '/ai/chat',
        input,
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
