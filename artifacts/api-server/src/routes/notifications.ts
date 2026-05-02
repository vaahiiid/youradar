import { Router, type IRouter } from "express";
import { requireUser } from "../middlewares/auth";
import { ensureUser } from "../lib/users";
import {
  createNotification,
  listNotifications,
  markNotificationSeen,
  type DecryptedNotification,
} from "../lib/notifications";

const router: IRouter = Router();

const KNOWN_KINDS = new Set([
  "email",
  "dm",
  "mention",
  "comment",
  "parcel",
  "system",
  "other",
]);

function serialize(n: DecryptedNotification) {
  return {
    id: n.id,
    sourceId: n.sourceId,
    provider: n.provider,
    kind: n.kind,
    occurredAt: n.occurredAt.toISOString(),
    isSeen: n.isSeen,
    title: n.title,
    snippet: n.snippet,
    senderName: n.senderName,
    senderIdentifier: n.senderIdentifier,
    externalRef: n.externalRef,
    createdAt: n.createdAt.toISOString(),
  };
}

router.use(requireUser);

router.get("/", async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureUser(userId);
  const items = await listNotifications(userId);
  req.log.info({ userId, count: items.length }, "notifications_listed");
  res.json({ items: items.map(serialize) });
});

router.post("/", async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureUser(userId);
  const body = req.body as Record<string, unknown> | undefined;

  const sourceId = typeof body?.sourceId === "string" ? body.sourceId : "";
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const occurredAtRaw =
    typeof body?.occurredAt === "string" ? body.occurredAt : null;
  const title = typeof body?.title === "string" ? body.title : "";
  const snippet = typeof body?.snippet === "string" ? body.snippet : null;
  const senderName =
    typeof body?.senderName === "string" ? body.senderName : null;
  const senderIdentifier =
    typeof body?.senderIdentifier === "string" ? body.senderIdentifier : null;
  const externalRef =
    typeof body?.externalRef === "string" ? body.externalRef : null;

  if (!sourceId) {
    res.status(400).json({ error: "missing_sourceId" });
    return;
  }
  if (!kind || !KNOWN_KINDS.has(kind)) {
    res.status(400).json({ error: "invalid_kind" });
    return;
  }
  if (!title || title.length > 500) {
    res.status(400).json({ error: "invalid_title" });
    return;
  }
  if (snippet != null && snippet.length > 5000) {
    res.status(400).json({ error: "snippet_too_long" });
    return;
  }
  let occurredAt: Date;
  if (occurredAtRaw) {
    occurredAt = new Date(occurredAtRaw);
    if (Number.isNaN(occurredAt.getTime())) {
      res.status(400).json({ error: "invalid_occurredAt" });
      return;
    }
  } else {
    occurredAt = new Date();
  }

  try {
    const created = await createNotification(userId, {
      sourceId,
      kind,
      occurredAt,
      title,
      snippet,
      senderName,
      senderIdentifier,
      externalRef,
    });
    req.log.info(
      {
        userId,
        notificationId: created.id,
        sourceId: created.sourceId,
        provider: created.provider,
        kind: created.kind,
      },
      "notification_created",
    );
    res.status(201).json(serialize(created));
  } catch (err) {
    if (err instanceof Error && err.message === "source_not_owned") {
      res.status(404).json({ error: "source_not_found" });
      return;
    }
    throw err;
  }
});

router.patch("/:id/seen", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!rawId) {
    res.status(400).json({ error: "missing_id" });
    return;
  }
  const updated = await markNotificationSeen(userId, rawId);
  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  req.log.info(
    { userId, notificationId: updated.id },
    "notification_marked_seen",
  );
  res.json(serialize(updated));
});

export default router;
