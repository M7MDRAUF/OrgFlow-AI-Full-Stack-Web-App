// rag-chat-agent — React hooks for the assistant chat feature.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChatAnswerPayload,
  ChatHistoryMessageDto,
  ChatRequestDto,
} from '@orgflow/shared-types';
import { apiClient } from '../../lib/api-client.js';

const CHAT_HISTORY_KEY = ['ai', 'chat', 'history'] as const;

export function useChatHistory(): ReturnType<typeof useQuery<ChatHistoryMessageDto[]>> {
  return useQuery<ChatHistoryMessageDto[]>({
    queryKey: CHAT_HISTORY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: { messages: ChatHistoryMessageDto[] };
      }>('/ai/chat/history');
      return res.data.data.messages;
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
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHAT_HISTORY_KEY });
    },
  });
}
