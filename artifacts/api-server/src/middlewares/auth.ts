import type { Request, Response, NextFunction } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const raw = req.header("x-user-id");
  if (typeof raw !== "string" || raw.length < 8 || raw.length > 128) {
    res.status(401).json({ error: "missing_or_invalid_user" });
    return;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) {
    res.status(401).json({ error: "invalid_user_id_format" });
    return;
  }
  req.userId = raw;
  next();
}
