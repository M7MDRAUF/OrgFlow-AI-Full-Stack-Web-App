// MongoDB connection manager.
import mongoose, { type Mongoose } from 'mongoose';
import type { AppEnv } from '../app/env.js';
import { getLogger } from './logger.js';

let connection: Mongoose | null = null;

export async function connectDatabase(env: AppEnv): Promise<Mongoose> {
  if (connection !== null) return connection;
  const logger = getLogger(env);
  mongoose.set('strictQuery', true);
  // H-009: bound connection establishment; without explicit timeouts a failed
  // DNS or unreachable host can hang a request indefinitely.
  mongoose.set('bufferCommands', false);
  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'mongodb connection error');
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('mongodb disconnected');
  });
  connection = await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    connectTimeoutMS: 10_000,
    maxPoolSize: 20,
    minPoolSize: 1,
  });
  logger.info('mongodb connected');

  // Validate vector search index exists (non-blocking, warn only).
  if (!env.DEV_VECTOR_FALLBACK) {
    validateVectorIndex(env).catch((err: unknown) => {
      logger.warn({ err }, 'vector index validation failed — retrieval may not work');
    });
  }

  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  if (connection === null) return;
  await connection.disconnect();
  connection = null;
}

/**
 * Check if the Atlas vector search index exists on the documentchunks collection.
 * Logs a warning if not found. Does not block startup.
 */
async function validateVectorIndex(env: AppEnv): Promise<void> {
  const logger = getLogger(env);
  const db = mongoose.connection.db;
  if (!db) return;
  try {
    const collection = db.collection('documentchunks');
    // listSearchIndexes is available on Atlas clusters with vector search enabled.
    const cursor = collection.listSearchIndexes();
    const indexes = await cursor.toArray();
    const hasVectorIndex = indexes.some(
      (idx) =>
        // eslint-disable-next-line @typescript-eslint/dot-notation -- index signature requires bracket access
        ('type' in idx && idx['type'] === 'vectorSearch') || idx.name === 'vector_index',
    );
    if (!hasVectorIndex) {
      logger.warn(
        'no vector search index found on documentchunks collection — AI retrieval requires Atlas vector search index',
      );
    } else {
      logger.info('vector search index validated');
    }
  } catch {
    // listSearchIndexes may not exist on non-Atlas or older MongoDB versions.
    logger.debug('could not verify vector index (non-Atlas or unsupported)');
  }
}
