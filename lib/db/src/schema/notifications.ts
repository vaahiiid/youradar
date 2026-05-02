import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { connectedSourcesTable } from "./connectedSources";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => connectedSourcesTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    kind: text("kind").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    isSeen: boolean("is_seen").notNull().default(false),
    titleEnc: jsonb("title_enc").notNull(),
    snippetEnc: jsonb("snippet_enc"),
    senderNameEnc: jsonb("sender_name_enc"),
    senderIdentifierEnc: jsonb("sender_identifier_enc"),
    externalRefEnc: jsonb("external_ref_enc"),
    // Deterministic hash of (sourceId + provider-message-id), used purely
    // for idempotent inserts during background polling. Plaintext column —
    // it is a hash, not encrypted content. Nullable for legacy rows that
    // predate background sync.
    externalRefHash: text("external_ref_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.occurredAt),
    index("notifications_source_idx").on(t.sourceId),
    uniqueIndex("notifications_source_external_ref_idx").on(
      t.sourceId,
      t.externalRefHash,
    ),
  ],
);

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
