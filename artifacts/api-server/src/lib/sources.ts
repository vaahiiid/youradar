import { eq, and } from "drizzle-orm";
import { db, connectedSourcesTable, type ConnectedSource } from "@workspace/db";
import {
  encryptForUser,
  decryptForUser,
  maybeDecryptForUser,
  maybeEncryptForUser,
  maybeEncryptTokenForUser,
  newId,
  type EncryptedField,
} from "./crypto";

export type DecryptedSource = {
  id: string;
  provider: string;
  status: string;
  accountIdentifier: string;
  displayLabel: string | null;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listSources(userId: string): Promise<DecryptedSource[]> {
  const rows = await db
    .select()
    .from(connectedSourcesTable)
    .where(eq(connectedSourcesTable.userId, userId))
    .orderBy(connectedSourcesTable.createdAt);

  return rows.map((row) => decryptSourceRow(userId, row));
}

export function decryptSourceRow(
  userId: string,
  row: ConnectedSource,
): DecryptedSource {
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    accountIdentifier: decryptForUser(
      userId,
      row.accountIdentifierEnc as EncryptedField,
    ),
    displayLabel: maybeDecryptForUser(userId, row.displayLabelEnc),
    hasAccessToken: row.accessTokenEnc != null,
    hasRefreshToken: row.refreshTokenEnc != null,
    tokenExpiresAt: row.tokenExpiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type CreateSourceInput = {
  provider: string;
  accountIdentifier: string;
  displayLabel?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
};

export async function createSource(
  userId: string,
  input: CreateSourceInput,
): Promise<DecryptedSource> {
  const id = newId();
  const [row] = await db
    .insert(connectedSourcesTable)
    .values({
      id,
      userId,
      provider: input.provider,
      status: "active",
      accountIdentifierEnc: encryptForUser(userId, input.accountIdentifier),
      displayLabelEnc: maybeEncryptForUser(userId, input.displayLabel ?? null),
      accessTokenEnc: maybeEncryptTokenForUser(userId, input.accessToken ?? null),
      refreshTokenEnc: maybeEncryptTokenForUser(userId, input.refreshToken ?? null),
      tokenExpiresAt: input.tokenExpiresAt ?? null,
    })
    .returning();

  if (!row) throw new Error("insert_failed");
  return decryptSourceRow(userId, row);
}

export async function renameSource(
  userId: string,
  id: string,
  displayLabel: string | null,
): Promise<DecryptedSource | null> {
  const [row] = await db
    .update(connectedSourcesTable)
    .set({
      displayLabelEnc: maybeEncryptForUser(userId, displayLabel),
    })
    .where(
      and(
        eq(connectedSourcesTable.id, id),
        eq(connectedSourcesTable.userId, userId),
      ),
    )
    .returning();

  if (!row) return null;
  return decryptSourceRow(userId, row);
}

export async function deleteSource(
  userId: string,
  id: string,
): Promise<boolean> {
  const [row] = await db
    .delete(connectedSourcesTable)
    .where(
      and(
        eq(connectedSourcesTable.id, id),
        eq(connectedSourcesTable.userId, userId),
      ),
    )
    .returning({ id: connectedSourcesTable.id });
  return Boolean(row);
}

export async function getOwnedSource(
  userId: string,
  id: string,
): Promise<ConnectedSource | null> {
  const [row] = await db
    .select()
    .from(connectedSourcesTable)
    .where(
      and(
        eq(connectedSourcesTable.id, id),
        eq(connectedSourcesTable.userId, userId),
      ),
    );
  return row ?? null;
}
