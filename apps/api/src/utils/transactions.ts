// platform-agent — DB-01 helper.
//
// MongoDB multi-document transactions REQUIRE a replica set or a sharded
// cluster. Local standalone deployments (the default for the dev setup
// described in TEAMMATE_SETUP.md) cannot start a transaction and will throw
// `Transaction numbers are only allowed on a replica set member or mongos`.
//
// This helper runs a unit of work transactionally when the cluster supports
// it, and falls back to a best-effort sequential execution on standalone
// instances. The fallback path logs a structured warn on partial failure so
// orphaned-data investigations have a breadcrumb.
import mongoose, { type ClientSession } from 'mongoose';
import { loadEnv } from '../app/env.js';
import { getLogger } from '../config/logger.js';

export interface TxResult {
  /** true when the work executed inside a real Mongo transaction. */
  transactional: boolean;
}

/**
 * Build an options object that contains `session` only when one is defined.
 * Required because Mongoose's option types use `session: ClientSession`
 * (no `| undefined`) and our tsconfig has `exactOptionalPropertyTypes:true`,
 * which forbids passing `{ session: undefined }`.
 */
export function withSession<T extends object>(
  base: T,
  session: ClientSession | undefined,
): T | (T & { session: ClientSession }) {
  return session === undefined ? base : { ...base, session };
}

/** Convenience for callers that only need the session option. */
export function sessionOpts(session: ClientSession | undefined): { session?: ClientSession } {
  return session === undefined ? {} : { session };
}

/**
 * Run `work` inside a `withTransaction(session)` if the cluster supports it,
 * otherwise call it with `session = null` so callers can pass the same value
 * straight through to Mongoose calls (Mongoose treats `null` as "no session").
 *
 * Use this for cascade-style multi-document deletes (project → tasks →
 * comments → documents → chunks) where a partial failure leaves orphan
 * records that retrieval would still serve.
 */
export async function runInTransaction(
  work: (session: ClientSession | undefined) => Promise<void>,
  context: string,
): Promise<TxResult> {
  const env = loadEnv();
  const logger = getLogger(env);
  let session: ClientSession | undefined;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    logger.warn(
      { err, context },
      'DB-01: could not start mongo session, running non-transactional',
    );
    await work(undefined);
    return { transactional: false };
  }
  try {
    await session.withTransaction(async () => {
      await work(session);
    });
    return { transactional: true };
  } catch (err) {
    const isStandalone =
      err instanceof Error &&
      /Transaction numbers are only allowed on a replica set member or mongos/i.test(err.message);
    if (isStandalone) {
      logger.warn(
        { context },
        'DB-01: mongo standalone detected — falling back to non-transactional cascade',
      );
      await work(undefined);
      return { transactional: false };
    }
    throw err;
  } finally {
    // session is guaranteed defined here: the only path that leaves it
    // undefined returns early before the try/finally below.
    await session.endSession();
  }
}
