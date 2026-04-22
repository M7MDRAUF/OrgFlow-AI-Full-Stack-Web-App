// rag-chat-agent — Lightweight intent gate for greetings, thanks, identity
// questions and other smalltalk. When a message is detected as chitchat the
// chat service skips RAG retrieval and the live STATS lookup so the assistant
// can reply naturally instead of dumping a grounded "STATS:" / "Sources:"
// block for a casual "hi". The detector is deliberately conservative: any
// message that contains workspace entity keywords (project, task, team, etc.)
// or that looks like a real question falls through to the normal RAG path.

const GREETING_REGEX =
  /^\s*(hi+|hello+|hey+|yo+|sup|hola|howdy|good\s+(morning|afternoon|evening|night)|gm|gn)(\s+(there|all|everyone|team|guys|folks|y'?all))?[\s!.,?]*$/i;

const HOW_ARE_YOU_REGEX =
  /\b(how\s+(are|r)\s+(you|u|ya|things|things\s+going)|how['’]?s\s+it\s+going|what['’]?s\s+up|wassup|whats\s+up)\b/i;

const THANKS_REGEX = /^\s*(thanks|thank\s+you|thx|ty|cheers|appreciate(\s+it)?)\b[\s!.,?]*$/i;

const FAREWELL_REGEX = /^\s*(bye|goodbye|see\s+ya|cya|later|good\s+night|gn)\b[\s!.,?]*$/i;

const IDENTITY_REGEX =
  /\b(who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|what['’]?s\s+your\s+name|introduce\s+yourself|help\s*$)\b/i;

// Workspace entity vocabulary — if the message touches these, it is NOT chitchat
// and must go through the normal grounded path even if it also contains a
// greeting word ("hi, how many tasks do I have?").
const WORKSPACE_KEYWORDS_REGEX =
  /\b(project|projects|task|tasks|team|teams|user|users|member|members|overdue|todo|done|in[- ]progress|announcement|announcements|document|documents|policy|policies|deadline|assigned|leader|admin|organization|org|dashboard|stat|stats|count|how\s+many|number\s+of|list)\b/i;

export type ChitchatKind = 'greeting' | 'how_are_you' | 'thanks' | 'farewell' | 'identity';

export interface ChitchatIntent {
  kind: ChitchatKind;
}

export function detectChitchatIntent(question: string): ChitchatIntent | null {
  const trimmed = question.trim();
  if (trimmed.length === 0) return null;
  // If the message references workspace entities, treat it as a real question.
  if (WORKSPACE_KEYWORDS_REGEX.test(trimmed)) return null;

  if (GREETING_REGEX.test(trimmed)) return { kind: 'greeting' };
  if (THANKS_REGEX.test(trimmed)) return { kind: 'thanks' };
  if (FAREWELL_REGEX.test(trimmed)) return { kind: 'farewell' };
  if (HOW_ARE_YOU_REGEX.test(trimmed)) return { kind: 'how_are_you' };
  if (IDENTITY_REGEX.test(trimmed)) return { kind: 'identity' };
  return null;
}

// Friendly canned replies used when the LLM is unreachable. The LLM, when
// available, gets a short system prompt and produces a more varied reply.
const CANNED: Record<ChitchatKind, string> = {
  greeting:
    "Hey! I'm doing well — I'm the OrgFlow assistant. Ask me about your teams, projects, tasks, announcements, or any document your workspace has ingested.",
  how_are_you:
    "I'm running smoothly, thanks for asking! What can I help you with in your workspace today?",
  thanks: "You're welcome! Let me know if there's anything else I can dig up for you.",
  farewell: 'Take care! I’ll be here whenever you need me.',
  identity:
    "I'm the OrgFlow internal assistant. I can answer questions about your organization's teams, projects, tasks, announcements, and any documents the workspace has ingested — always scoped to what you're allowed to see.",
};

export function chitchatFallbackReply(kind: ChitchatKind): string {
  return CANNED[kind];
}

// System prompt for the LLM when handling chitchat. Keeps the persona warm and
// concise, and explicitly forbids fabricating workspace data from thin air.
export function chitchatSystemPrompt(kind: ChitchatKind): string {
  return [
    'You are OrgFlow, a friendly internal workspace assistant.',
    'The user just sent a short conversational message (no workspace question).',
    `Conversation kind: ${kind}.`,
    'Reply naturally in 1–2 short sentences, in a warm, professional tone.',
    'Do NOT invent any numbers, names, projects, tasks, users, or policies.',
    'Do NOT include "STATS:", "Sources:", citations, or bullet lists.',
    'If the user greets you, briefly mention you can help with their teams, projects, tasks, announcements, or ingested documents.',
  ].join(' ');
}
