// rag-chat-agent — AI Assistant page with conversation thread + citation pills.
import type { AiSourceCitation, OllamaConnectionStatus } from '@orgflow/shared-types';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, Textarea } from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import { useAskAssistant, useChatHistory, useOllamaStatus } from './useChat.js';

export function AssistantPage(): JSX.Element {
  const [question, setQuestion] = useState<string>('');
  const history = useChatHistory();
  const ask = useAskAssistant();
  const ollamaStatus = useOllamaStatus();

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length === 0 || ask.isPending) return;
    ask.mutate(
      { question: trimmed },
      {
        onSuccess: () => {
          setQuestion('');
        },
      },
    );
  };

  if (history.isLoading) return <Skeleton className="h-64" />;
  if (history.isError) {
    return (
      <ErrorState
        title="Failed to load assistant history"
        description={history.error.message}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void history.refetch();
            }}
          >
            Retry
          </Button>
        }
      />
    );
  }

  const messages = history.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">AI Assistant</h1>
          <OllamaStatusDot status={ollamaStatus.status} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ask questions about documents you have access to. Answers are grounded in sources you can
          see.
        </p>
      </header>

      <section
        aria-label="Conversation"
        className="flex min-h-[300px] flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        {messages.length === 0 ? (
          <EmptyState title="No conversation yet" description="Ask your first question below." />
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id}>
                <MessageBubble
                  role={m.role}
                  content={m.content}
                  sources={m.sources}
                  createdAt={m.createdAt}
                />
              </li>
            ))}
            {ask.isPending ? (
              <li>
                <MessageBubble role="assistant" content="Thinking…" sources={[]} createdAt={null} />
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <form
        onSubmit={submit}
        className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <label htmlFor="assistant-question" className="text-sm font-medium">
          Your question
        </label>
        <Textarea
          id="assistant-question"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
          }}
          rows={3}
          placeholder="e.g. What is our onboarding policy?"
          disabled={ask.isPending}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Responses include citations.</span>
          <Button type="submit" loading={ask.isPending} disabled={question.trim().length === 0}>
            Ask
          </Button>
        </div>
        {ask.isError ? (
          <p role="alert" className="text-sm text-rose-600">
            {ask.error.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  sources: AiSourceCitation[];
  createdAt: string | null;
}

function MessageBubble({ role, content, sources, createdAt }: MessageBubbleProps): JSX.Element {
  const isUser = role === 'user';
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Badge tone={isUser ? 'info' : 'success'}>{isUser ? 'You' : 'Assistant'}</Badge>
          {createdAt !== null ? (
            <span className="text-xs text-slate-400">{new Date(createdAt).toLocaleString()}</span>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap text-sm">{content}</p>
        {sources.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500">Sources:</span>
            {sources.map((s, i) => (
              <Badge key={`${s.documentId}-${String(s.chunkIndex)}`} tone="default">
                [{i + 1}] {s.title}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

const STATUS_CONFIG: Record<
  OllamaConnectionStatus | 'checking',
  { dotClass: string; label: string }
> = {
  connected: { dotClass: 'bg-emerald-500', label: 'Connected' },
  disconnected: { dotClass: 'bg-rose-500', label: 'Disconnected' },
  checking: { dotClass: 'bg-slate-400 animate-pulse', label: 'Checking...' },
};

function OllamaStatusDot({ status }: { status: OllamaConnectionStatus | 'checking' }): JSX.Element {
  const { dotClass, label } = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
      {label}
    </span>
  );
}
