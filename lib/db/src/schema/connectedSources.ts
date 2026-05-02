import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const connectedSourcesTable = pgTable(
  "connected_sources",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("active"),
    accountIdentifierEnc: jsonb("account_identifier_enc").notNull(),
    displayLabelEnc: jsonb("display_label_enc"),
    accessTokenEnc: jsonb("access_token_enc"),
    refreshTokenEnc: jsonb("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    // Background-sync cursor + status. Plaintext jsonb because it stores
    // opaque provider IDs (e.g. Gmail historyId) and timestamps, never
    // user content. Shape: { lastHistoryId?, lastPolledAt?, lastError?,
    // initialized? } — flexible to evolve per provider.
    syncState: jsonb("sync_state"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("connected_sources_user_idx").on(t.userId),
    index("connected_sources_provider_idx").on(t.userId, t.provider),
  ],
);

export type ConnectedSource = typeof connectedSourcesTable.$inferSelect;
export type InsertConnectedSource =
  typeof connectedSourcesTable.$inferInsert;
