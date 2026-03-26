import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { alerts } from './alerts';

export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'push']);
export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    alertId: uuid('alert_id')
      .notNull()
      .references(() => alerts.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull().default('email'),
    status: notificationStatusEnum('status').notNull().default('pending'),
    // Stores rendered email content / push payload for debugging & resend
    payload: jsonb('payload').notNull().default({}),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    alertIdx: index('notifications_alert_idx').on(table.alertId),
    statusIdx: index('notifications_status_idx').on(table.status),
  }),
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
