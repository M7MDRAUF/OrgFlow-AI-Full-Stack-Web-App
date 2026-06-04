// platform-agent — OPS-01: shared rate-limit store factory.
//
// `express-rate-limit` defaults to an in-process Memory store, which means
// every replica gets its own counter — defeated by any horizontal scale.
// When `REDIS_URL` is configured we wire `rate-limit-redis` (Redis SETs +
// SCRIPTs) so a single budget is enforced across all replicas. When it is
// empty (the default for local dev) we silently fall back to the in-process
// store, so nothing breaks for solo developers.
//
// We share **one** Redis client across all limiters to avoid blowing past
// the connection pool, and we degrade gracefully if Redis is unreachable at
// startup — a logged warn beats a hard crash in production for a non-core
// dependency.
import { Redis } from 'ioredis';
import RedisStore, { type RedisReply } from 'rate-limit-redis';
import { loadEnv } from '../app/env.js';
import { getLogger } from '../config/logger.js';

let cachedClient: Redis | null = null;
let attempted = false;

function getRedisClient(): Redis | null {
  if (attempted) return cachedClient;
  attempted = true;
  const env = loadEnv();
  if (env.REDIS_URL.length === 0) return null;
  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    client.on('error', (err) => {
      // Don't escalate — `enableOfflineQueue:false` makes individual ops
      // fail fast; `express-rate-limit` then falls back to allowing the
      // request rather than blocking on Redis. We log so operators notice.
      getLogger(env).warn({ err }, 'OPS-01: redis rate-limit client error');
    });
    cachedClient = client;
    return client;
  } catch (err) {
    getLogger(env).warn(
      { err },
      'OPS-01: failed to init redis client; falling back to memory store',
    );
    return null;
  }
}

interface RateLimitStoreResult {
  store?: RedisStore;
}

/**
 * Build an `express-rate-limit` Options object whose `store` is a Redis
 * store when REDIS_URL is configured, otherwise undefined (the default
 * memory store will be used). `prefix` namespaces keys per-limiter so
 * counters don't collide.
 */
export function rateLimitStoreOptions(prefix: string): RateLimitStoreResult {
  const client = getRedisClient();
  if (client === null) return {};
  const store = new RedisStore({
    sendCommand: async (...args: string[]): Promise<RedisReply> =>
      (await client.call(args[0] ?? '', ...args.slice(1))) as RedisReply,
    prefix: `rl:${prefix}:`,
  });
  return { store };
}
