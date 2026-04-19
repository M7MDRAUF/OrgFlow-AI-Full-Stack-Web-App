// qa-agent — TG-F04: useAskAssistant hook test.
import type { ChatAnswerPayload } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/api-client.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { apiClient } = await import('../src/lib/api-client.js');
const { useAskAssistant, useChatHistory } = await import('../src/features/ai/useChat.js');

const mockedPost = vi.mocked(apiClient.post);
const mockedGet = vi.mocked(apiClient.get);

let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAskAssistant', () => {
  it('sends question and returns answer with sources', async () => {
    const mockPayload: ChatAnswerPayload = {
      answer: 'AI answer here',
      sources: [],
      durationMs: 150,
      usedFallback: false,
    };
    mockedPost.mockResolvedValueOnce({
      data: { success: true, data: mockPayload },
    });

    const { result } = renderHook(() => useAskAssistant(), { wrapper });

    act(() => {
      result.current.mutate({ question: 'What is OrgFlow?' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.answer).toBe('AI answer here');
    expect(mockedPost).toHaveBeenCalledWith('/ai/chat', { question: 'What is OrgFlow?' });
  });

  it('handles error from API', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Ollama unavailable'));
    const { result } = renderHook(() => useAskAssistant(), { wrapper });

    act(() => {
      result.current.mutate({ question: 'fail please' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Ollama unavailable');
  });
});

describe('useChatHistory', () => {
  it('fetches chat history messages', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          messages: [
            { role: 'user', content: 'Hello', sources: [], createdAt: '2024-01-01T00:00:00Z' },
            { role: 'assistant', content: 'Hi', sources: [], createdAt: '2024-01-01T00:00:01Z' },
          ],
        },
      },
    });

    const { result } = renderHook(() => useChatHistory(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]?.content).toBe('Hello');
  });
});
