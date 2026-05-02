import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { ensureUser } from "../lib/users";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  // Prefer the migrated-user mapping in sessionClaims when present, otherwise
  // fall back to the native Clerk user id. See clerk-auth migration docs.
  const claimUserId =
    typeof (auth.sessionClaims as { userId?: unknown } | null)?.userId === "string"
      ? ((auth.sessionClaims as { userId?: string }).userId as string)
      : null;
  const userId = claimUserId ?? auth.userId;

  if (!userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  // Defensive validation — Clerk ids are like "user_xxx" but we also accept
  // any reasonable identifier shape so migrated ids continue to work.
  if (
    typeof userId !== "string" ||
    userId.length < 3 ||
    userId.length > 128 ||
    !/^[A-Za-z0-9_-]+$/.test(userId)
  ) {
    res.status(401).json({ error: "invalid_user_id_format" });
    return;
  }

  try {
    await ensureUser(userId);
  } catch (err) {
    req.log.error({ err }, "ensure_user_failed");
    res.status(500).json({ error: "user_provisioning_failed" });
    return;
  }

  req.userId = userId;
  next();
}
