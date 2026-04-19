import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_PATH: z.string().startsWith('/').default('/api/v1'),
  MONGODB_URI: z.string().min(1),
  // I-001: JWT_SECRET must be cryptographically strong. 32 bytes ≈ 256 bits.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhdw]$/, 'JWT_EXPIRES_IN must be a valid duration (e.g. "7d", "4h", "30m")')
    .default('7d'),
  // Comma-separated origins; validated + normalised by getCorsOrigins(). Kept
  // as a raw string here to stay compatible with existing test fixtures.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  OLLAMA_HOST: z.string().url().default('http://localhost:11434'),
  OLLAMA_CHAT_MODEL: z.string().default('gemma3'),
  OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),
  OLLAMA_EMBED_DIMENSIONS: z.coerce.number().int().positive().default(768),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(10),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  // F-001: when true, retrieval falls back to in-memory cosine similarity
  // instead of Atlas $vectorSearch. Intended for local dev / CI where no
  // Atlas vector index exists.
  DEV_VECTOR_FALLBACK: z
    .enum(['0', '1'])
    .default('1')
    .transform((v) => v === '1'),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cached !== null) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Parse CORS_ORIGIN into a normalised allow-list (I-005). Accepts single origin
 * or comma-separated. Empty entries are stripped. Never matches wildcard '*'.
 */
export function getCorsOrigins(env: AppEnv): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '*');
}
