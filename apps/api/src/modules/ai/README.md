# AI Module

## Purpose

Provides permission-aware document ingestion (upload, parse, chunk, embed) and RAG-powered chat with source citations via Ollama and MongoDB Vector Search.

## Submodules

### Documents (`documents/`)

Handles document upload, text extraction, chunking, embedding generation, and lifecycle management.

### Chat (`chat/`)

Provides the conversational AI endpoint that retrieves relevant chunks and generates grounded answers with citations.

### Shared Files

- `embeddings.ts` — Embedding generation via Ollama embedding model
- `retrieval.ts` — Permission-aware vector search with RBAC scope filters

## Endpoints

### Document Endpoints

| Method | Path                        | Auth | Role         | Description                              |
| ------ | --------------------------- | ---- | ------------ | ---------------------------------------- |
| GET    | `/ai/documents`             | Yes  | Any          | List ingested documents (scoped by role) |
| POST   | `/ai/documents`             | Yes  | Admin/Leader | Upload and ingest a document             |
| GET    | `/ai/documents/:id`         | Yes  | Any          | Get a single document by ID              |
| POST   | `/ai/documents/:id/reindex` | Yes  | Admin/Leader | Re-index an existing document            |
| DELETE | `/ai/documents/:id`         | Yes  | Admin/Leader | Delete a document and its chunks         |

### Chat Endpoints

| Method | Path               | Auth | Role | Description                           |
| ------ | ------------------ | ---- | ---- | ------------------------------------- |
| POST   | `/ai/chat`         | Yes  | Any  | Send a question to the AI assistant   |
| GET    | `/ai/chat/history` | Yes  | Any  | Get chat history for the current user |

## Files

- `documents/document.routes.ts` — Document route definitions with upload rate-limiting
- `documents/document.controller.ts` — Document request handlers
- `documents/document.service.ts` — Upload, parse, chunk, embed pipeline
- `documents/document.model.ts` — Mongoose schema for Document
- `documents/document-chunk.model.ts` — Mongoose schema for DocumentChunk (with embedding vector)
- `documents/document.schema.ts` — Zod validation for upload and query inputs
- `documents/chunker.ts` — Text chunking logic
- `documents/parser.ts` — Text extraction from uploaded files
- `documents/mime-detect.ts` — Magic-byte MIME type verification
- `chat/chat.routes.ts` — Chat route definitions with rate-limiting
- `chat/chat.controller.ts` — Chat request handlers
- `chat/chat.service.ts` — LLM prompt construction, Ollama call, fallback logic
- `chat/chat-log.model.ts` — Mongoose schema for ChatLog
- `chat/chat.schema.ts` — Zod validation for chat request input

## Key Behaviors

- Retrieval always applies organization/team/project/role filters — chunks are never returned across unauthorized scopes (AGENTS.md §12)
- Documents have three visibility levels: `organization`, `team`, and `project`, with optional `allowedRoles` restrictions
- Members cannot upload documents; leaders can only upload to their own team/projects; admins can upload org-wide
- Chat uses prompt-injection defences (explicit delimiters, instruction to treat user input as data) and falls back to extractive answers if the LLM is unreachable
- MIME type is verified against file magic bytes before any document record is persisted (H-002)
- Document uploads are rate-limited to 10 per 15 minutes; chat requests are limited to 30 per minute
