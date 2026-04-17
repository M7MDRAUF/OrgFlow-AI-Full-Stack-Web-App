// Integration test setup — in-memory MongoDB instance.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll } from 'vitest';

let memoryServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (memoryServer !== null) {
    await memoryServer.stop();
  }
}, 30_000);
