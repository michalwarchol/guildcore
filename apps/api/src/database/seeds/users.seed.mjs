import 'dotenv/config';
import argon2 from 'argon2';
import pg from 'pg';

const SEED_PASSWORD = 'password123';

const SEED_USERS = [
  {
    email: 'john.doe@michalwarchol.com',
    username: 'john_doe',
    displayName: 'John Doe',
  },
  {
    email: 'jane.doe@michalwarchol.com',
    username: 'jane_doe',
    displayName: 'Jane Doe',
  },
  {
    email: 'alex.smith@michalwarchol.com',
    username: 'alex_smith',
    displayName: 'Alex Smith',
  },
];

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed users when NODE_ENV is production');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed users');
}

const passwordHash = await argon2.hash(SEED_PASSWORD, {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  for (const user of SEED_USERS) {
    const inserted = await client.query(
      `
        INSERT INTO users (username, email, display_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET
          username = EXCLUDED.username,
          display_name = EXCLUDED.display_name,
          updated_at = now()
        RETURNING id
      `,
      [user.username, user.email, user.displayName],
    );
    const userId = inserted.rows[0]?.id;
    if (!userId) {
      throw new Error(`Seed did not return an id for ${user.email}`);
    }
    await client.query(
      `
        INSERT INTO auth_credentials (user_id, password_hash)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          updated_at = now()
      `,
      [userId, passwordHash],
    );
  }
} finally {
  await client.end();
}
