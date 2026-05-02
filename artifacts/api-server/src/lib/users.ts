import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { newId } from "./crypto";

export async function ensureUser(userId: string): Promise<void> {
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (existing) return;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();
}

export async function createNewUser(): Promise<string> {
  const id = newId();
  await db.insert(usersTable).values({ id });
  return id;
}
