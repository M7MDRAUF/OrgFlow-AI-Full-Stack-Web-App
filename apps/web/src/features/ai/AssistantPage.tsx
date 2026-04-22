// rag-chat-agent — AI Assistant page with conversation thread + citation pills.
import type { AiSourceCitation, OllamaConnectionStatus } from '@orgflow/shared-types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  Skeleton,
  Textarea,
} from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAskAssistant, useChatHistory, useClearChat, useOllamaStatus } from './useChat.js';

export function AssistantPage(): JSX.Element {
  const [question, setQuestion] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const history = useChatHistory();
  const ask = useAskAssistant();
  const clear = useClearChat();
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
  const canClear = messages.length > 0 && !ask.isPending && !clear.isPending;

  const confirmClear = (): void => {
    clear.mutate(undefined, {
      onSettled: () => {
        setConfirmOpen(false);
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">AI Assistant</h1>
            <OllamaStatusDot status={ollamaStatus.status} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ask questions about documents you have access to. Answers are grounded in sources you
            can see.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!canClear}
          loading={clear.isPending}
          onClick={() => {
            setConfirmOpen(true);
          }}
        >
          Clear chat
        </Button>
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

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!clear.isPending) setConfirmOpen(false);
        }}
        title="Clear chat history?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={clear.isPending}
              onClick={() => {
                setConfirmOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={clear.isPending} onClick={confirmClear}>
              Clear
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This permanently removes <strong>your</strong> chat messages with the assistant. Other
          users are not affected. This cannot be undone.
        </p>
      </Modal>
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
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        ) : (
          <AssistantMarkdown content={content} />
        )}
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

// Renders assistant markdown safely: GFM tables / lists / code, no raw HTML.
// Tailwind classes mirror the existing chat bubble typography and dark mode
// palette so a returned table feels native to the UI.
function AssistantMarkdown({ content }: { content: string }): JSX.Element {
  return (
    <div
      className="text-sm leading-relaxed text-slate-800 dark:text-slate-100"
      data-testid="assistant-markdown"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          p: ({ children }) => <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
          h1: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
          h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline hover:text-sky-700 dark:text-sky-400"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto rounded bg-slate-100 p-3 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="min-w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 align-top text-slate-700 dark:text-slate-200">{children}</td>
          ),
          hr: () => <hr className="my-2 border-slate-200 dark:border-slate-700" />,
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-4 border-slate-300 pl-3 italic text-slate-600 dark:border-slate-600 dark:text-slate-300">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
