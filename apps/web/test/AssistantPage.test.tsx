// rag-chat-agent — AI Assistant page smoke tests.
import type { AiSourceCitation, ChatHistoryMessageDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssistantPage } from '../src/features/ai/AssistantPage.js';

vi.mock('../src/features/ai/useChat.js', () => ({
  useChatHistory: vi.fn(),
  useAskAssistant: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useOllamaStatus: vi.fn(() => ({
    status: 'connected' as const,
  })),
}));

const { useChatHistory } = await import('../src/features/ai/useChat.js');
const mockedUseChatHistory = vi.mocked(useChatHistory);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sampleMessages: ChatHistoryMessageDto[] = [
  {
    id: 'm1',
    role: 'user',
    content: 'What is our vacation policy?',
    sources: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm2',
    role: 'assistant',
    content: 'According to the employee handbook, you get 20 days.',
    sources: [
      { documentId: 'd1', title: 'Employee Handbook', chunkIndex: 3 } satisfies AiSourceCitation,
    ],
    createdAt: new Date().toISOString(),
  },
];

describe('<AssistantPage />', () => {
  it('renders conversation with messages and citations', () => {
    mockedUseChatHistory.mockReturnValue({
      data: sampleMessages,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChatHistory>);

    render(<AssistantPage />, { wrapper });
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('What is our vacation policy?')).toBeInTheDocument();
    expect(
      screen.getByText('According to the employee handbook, you get 20 days.'),
    ).toBeInTheDocument();
    // citation badge
    expect(screen.getByText('[1] Employee Handbook')).toBeInTheDocument();
  });

  it('renders empty state when no messages', () => {
    mockedUseChatHistory.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChatHistory>);

    render(<AssistantPage />, { wrapper });
    expect(screen.getByText('No conversation yet')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseChatHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useChatHistory>);

    const { container } = render(<AssistantPage />, { wrapper });
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders error state with retry', () => {
    mockedUseChatHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Server unavailable'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChatHistory>);

    render(<AssistantPage />, { wrapper });
    expect(screen.getByText('Failed to load assistant history')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders question form with submit button', () => {
    mockedUseChatHistory.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChatHistory>);

    render(<AssistantPage />, { wrapper });
    expect(screen.getByLabelText('Your question')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument();
  });
});
