// MongoDB connection manager.
import mongoose, { type Mongoose } from 'mongoose';
import type { AppEnv } from '../app/env.js';
import { getLogger } from './logger.js';

let connection: Mongoose | null = null;

export async function connectDatabase(env: AppEnv): Promise<Mongoose> {
  if (connection !== null) return connection;
  const logger = getLogger(env);
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'mongodb connection error');
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('mongodb disconnected');
  });
  connection = await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });
  logger.info('mongodb connected');
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  if (connection === null) return;
  await connection.disconnect();
  connection = null;
}
