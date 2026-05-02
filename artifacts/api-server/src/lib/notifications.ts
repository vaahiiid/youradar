import { eq, and, desc } from "drizzle-orm";
import {
  db,
  notificationsTable,
  connectedSourcesTable,
  type Notification,
} from "@workspace/db";
import {
  encryptForUser,
  decryptForUser,
  maybeDecryptForUser,
  maybeEncryptForUser,
  newId,
  type EncryptedField,
} from "./crypto";

export type DecryptedNotification = {
  id: string;
  sourceId: string;
  provider: string;
  kind: string;
  occurredAt: Date;
  isSeen: boolean;
  title: string;
  snippet: string | null;
  senderName: string | null;
  senderIdentifier: string | null;
  externalRef: string | null;
  createdAt: Date;
};

function decryptNotificationRow(
  userId: string,
  row: Notification,
): DecryptedNotification {
  return {
    id: row.id,
    sourceId: row.sourceId,
    provider: row.provider,
    kind: row.kind,
    occurredAt: row.occurredAt,
    isSeen: row.isSeen,
    title: decryptForUser(userId, row.titleEnc as EncryptedField),
    snippet: maybeDecryptForUser(userId, row.snippetEnc),
    senderName: maybeDecryptForUser(userId, row.senderNameEnc),
    senderIdentifier: maybeDecryptForUser(userId, row.senderIdentifierEnc),
    externalRef: maybeDecryptForUser(userId, row.externalRefEnc),
    createdAt: row.createdAt,
  };
}

export async function listNotifications(
  userId: string,
  limit = 100,
): Promise<DecryptedNotification[]> {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.occurredAt))
    .limit(limit);
  return rows.map((r) => decryptNotificationRow(userId, r));
}

export type CreateNotificationInput = {
  sourceId: string;
  kind: string;
  occurredAt: Date;
  title: string;
  snippet?: string | null;
  senderName?: string | null;
  senderIdentifier?: string | null;
  externalRef?: string | null;
};

export async function createNotification(
  userId: string,
  input: CreateNotificationInput,
): Promise<DecryptedNotification> {
  const [source] = await db
    .select({
      id: connectedSourcesTable.id,
      provider: connectedSourcesTable.provider,
    })
    .from(connectedSourcesTable)
    .where(
      and(
        eq(connectedSourcesTable.id, input.sourceId),
        eq(connectedSourcesTable.userId, userId),
      ),
    );

  if (!source) {
    throw new Error("source_not_owned");
  }

  const id = newId();
  const [row] = await db
    .insert(notificationsTable)
    .values({
      id,
      userId,
      sourceId: source.id,
      provider: source.provider,
      kind: input.kind,
      occurredAt: input.occurredAt,
      isSeen: false,
      titleEnc: encryptForUser(userId, input.title),
      snippetEnc: maybeEncryptForUser(userId, input.snippet ?? null),
      senderNameEnc: maybeEncryptForUser(userId, input.senderName ?? null),
      senderIdentifierEnc: maybeEncryptForUser(
        userId,
        input.senderIdentifier ?? null,
      ),
      externalRefEnc: maybeEncryptForUser(userId, input.externalRef ?? null),
    })
    .returning();
  if (!row) throw new Error("insert_failed");
  return decryptNotificationRow(userId, row);
}

export async function markNotificationSeen(
  userId: string,
  id: string,
): Promise<DecryptedNotification | null> {
  const [row] = await db
    .update(notificationsTable)
    .set({ isSeen: true })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.userId, userId),
      ),
    )
    .returning();
  if (!row) return null;
  return decryptNotificationRow(userId, row);
}
