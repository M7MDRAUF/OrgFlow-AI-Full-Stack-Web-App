---
applyTo: 'apps/api/src/modules/ai/**/*.ts,apps/web/src/features/ai/**/*.{ts,tsx},apps/web/src/pages/**/*AI*.tsx,packages/shared-types/**/*.ts'
---

# AI / RAG Instructions — OrgFlow AI

These instructions apply to AI ingestion, retrieval, chat orchestration, and AI frontend work.

## Mission

Build a reliable, permission-aware internal AI assistant using local Ollama models and MongoDB Vector Search.

The assistant must answer from authorized internal documents, not behave like an unrestricted general chatbot.

## Hard Rules

1. Never use `any`, `as any`, `any[]`, or `Record<string, any>`.
2. Never retrieve from the full document corpus without permission filters.
3. Never expose unauthorized chunks or metadata across roles, teams, or projects.
4. Never expose raw embeddings to the frontend.
5. Never hallucinate policy or company facts when retrieval context does not support them.
6. Never bypass document parsing, chunking, or validation safeguards.
7. Never return debug internals that leak sensitive implementation details.

## AI System Goal

The AI subsystem must support:

- document upload
- parsing
- text normalization
- chunking
- embeddings generation
- vector storage
- filtered retrieval
- grounded prompt construction
- answer generation
- source citations
- chat logging

## Retrieval Philosophy

This project uses **RAG**, not unrestricted free-form answering.

The answer must be grounded in retrieved context.

If the answer is not present in the retrieved context, respond clearly that the information is not available in the authorized knowledge base.

## Permission-Aware Retrieval Rules

This is the most critical AI rule.

Every retrieval must filter by the authenticated user's allowed scope.

At minimum, retrieval filters must consider:

- `organizationId`
- `visibility`
- `allowedRoles`
- `teamId` when applicable
- `projectId` when applicable

### Scope Behavior

- Admin may search organization-visible data.
- Leader may search allowed team/project scope.
- Member may search only personally authorized scope.

Do not perform retrieval first and filter later in the client.
Filtering must happen in the retrieval query itself.

## Document Lifecycle Rules

### 1. Upload

- Accept only approved document formats.
- Enforce file size and MIME restrictions.
- Store document metadata with scope fields.

### 2. Parse

- Extract text safely.
- Fail cleanly on unsupported or corrupted files.
- Track document processing status.

### 3. Clean

- Normalize whitespace.
- Preserve meaningful structure when possible.
- Avoid producing noisy empty chunks.

### 4. Chunk

- Use predictable chunking rules.
- Keep chunk sizes consistent enough for retrieval quality.
- Include overlap when needed.
- Preserve chunk index and source metadata.

### 5. Embed

- Use the configured local embeddings model.
- Keep embedding logic isolated in a dedicated service.
- Do not entangle embedding generation with prompt construction.

### 6. Persist

Store:

- document metadata
- chunk text
- embedding vector
- organization/team/project visibility metadata
- allowed roles metadata
- chunk index

### 7. Retrieve

- Embed the user query.
- Perform vector search with metadata filters.
- Keep top-k bounded.
- Return only the chunks necessary for grounded answering.

### 8. Generate

- Use a dedicated prompt service.
- Keep prompts deterministic and concise.
- Instruct the model to answer only from context.

### 9. Respond

Return:

- answer text
- source citations
- safe metadata only

### 10. Log

Log:

- question
- user scope
- retrieved source identifiers
- duration
- success/failure state

Do not log secrets, full tokens, or raw embeddings.

## Prompt Construction Rules

Prompt construction must:

- identify the system as an internal assistant
- instruct the model to rely only on provided context
- require the model to admit uncertainty when context is missing
- keep responses professional and concise
- prefer source-aware answers

Avoid giant prompts with unrelated instructions.

## Chat API Rules

- Request payloads must be validated.
- Responses must be typed and stable.
- Source citations must be included in a structured way.
- Chat endpoints must not return unauthorized debug traces.

## AI Frontend Rules

### Chat UI

- Message objects must be typed.
- Keep user and assistant message rendering separate and explicit.
- Display citations clearly.
- Support loading, empty, and error states.
- Do not expose internal pipeline complexity to the user unless explicitly designed.

### Sources UI

- Show human-readable document titles when possible.
- Show chunk/source identifiers only if useful and non-sensitive.
- Never render raw vector data or unsafe internal metadata.

## Service Separation Rules

Keep these concerns separate:

- `parser.service`
- `chunking.service`
- `embedding.service`
- `retrieval.service`
- `prompt.service`
- `chat.service`
- `citation.service`

Do not collapse everything into one giant AI service file.

## Data Modeling Rules

AI-related documents and chunks must include enough metadata to enforce scope safely.

Typical chunk metadata should include:

- `documentId`
- `organizationId`
- `teamId` or null
- `projectId` or null
- `visibility`
- `allowedRoles`
- `chunkIndex`
- source/title information

## Failure Handling Rules

- Document ingestion failures must set a failure status.
- Partial processing should not masquerade as successful indexing.
- Retrieval failures must not crash the app silently.
- Model/API failures from Ollama must be normalized into safe application errors.

## Naming and Anti-Conflict Rules

Prefer explicit AI names:

- `aiChatMessage`
- `aiSourceCitation`
- `retrievalScopeFilter`
- `documentChunkRecord`
- `embeddingVector`
- `chatAnswerPayload`

Avoid vague names such as `data`, `responseData`, `resultObj`, `tempChunks` unless trivially local.

## Testing Expectations

Add or update tests for:

- parsing helpers
- chunking behavior
- retrieval scope filtering
- prompt construction
- citation formatting
- AI chat endpoint contracts
- frontend message and citation rendering

## Completion Checklist

Before considering AI/RAG work complete:

1. TypeScript passes with no errors.
2. ESLint passes with no errors.
3. No `any` was introduced.
4. Retrieval is permission-aware.
5. No unauthorized content can leak across scopes.
6. Answer generation is grounded in retrieved context.
7. Source citations are returned safely and clearly.
8. Raw embeddings are never exposed to the frontend.
