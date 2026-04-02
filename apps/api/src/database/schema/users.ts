import {
  boolean,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    name: varchar('name', { length: 100 }),
    role: userRoleEnum('role').notNull().default('user'),
    isVerified: boolean('is_verified').notNull().default(false),
    verificationToken: varchar('verification_token', { length: 255 }),
    // OAuth
    provider: varchar('provider', { length: 50 }),
    providerId: varchar('provider_id', { length: 255 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    // Stores hashed refresh token to allow invalidation on logout
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    providerIdx: uniqueIndex('users_provider_idx').on(table.provider, table.providerId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SafeUser = Omit<User, 'passwordHash' | 'refreshTokenHash' | 'verificationToken'>;
