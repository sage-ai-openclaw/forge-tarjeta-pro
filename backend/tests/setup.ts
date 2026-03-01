import { beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDatabase, getDatabase } from '../src/db/database';

process.env.DB_PATH = ':memory:';

beforeAll(async () => {
  await initializeDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  const db = await getDatabase();
  await db.run('DELETE FROM promotions');
  await db.run('DELETE FROM user_cards');
  await db.run('DELETE FROM user_preferences');
  await db.run('DELETE FROM users');
  await db.run('DELETE FROM cards');
  // Keep banks (they're default data)
});
