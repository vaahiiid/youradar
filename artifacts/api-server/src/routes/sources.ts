import { Router, type IRouter } from "express";
import { requireUser } from "../middlewares/auth";
import { ensureUser } from "../lib/users";
import {
  createSource,
  listSources,
  renameSource,
  deleteSource,
  type DecryptedSource,
} from "../lib/sources";

const router: IRouter = Router();

const KNOWN_PROVIDERS = new Set([
  "gmail",
  "outlook",
  "yahoo",
  "icloud",
  "instagram",
  "x",
  "tiktok",
  "linkedin",
  "royalmail",
  "evri",
  "dpd",
  "amazon",
  "other",
]);

function serialize(s: DecryptedSource) {
  return {
    id: s.id,
    provider: s.provider,
    status: s.status,
    accountIdentifier: s.accountIdentifier,
    displayLabel: s.displayLabel,
    hasAccessToken: s.hasAccessToken,
    hasRefreshToken: s.hasRefreshToken,
    tokenExpiresAt: s.tokenExpiresAt ? s.tokenExpiresAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

router.use(requireUser);

router.get("/", async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureUser(userId);
  const items = await listSources(userId);
  req.log.info({ userId, count: items.length }, "sources_listed");
  res.json({ items: items.map(serialize) });
});

router.post("/", async (req, res): Promise<void> => {
  const userId = req.userId!;
  await ensureUser(userId);

  const body = req.body as Record<string, unknown> | undefined;
  const provider = typeof body?.provider === "string" ? body.provider : "";
  const accountIdentifier =
    typeof body?.accountIdentifier === "string" ? body.accountIdentifier : "";
  const displayLabel =
    typeof body?.displayLabel === "string" ? body.displayLabel : null;
  const accessToken =
    typeof body?.accessToken === "string" ? body.accessToken : null;
  const refreshToken =
    typeof body?.refreshToken === "string" ? body.refreshToken : null;
  const tokenExpiresAtRaw =
    typeof body?.tokenExpiresAt === "string" ? body.tokenExpiresAt : null;

  if (!provider || !KNOWN_PROVIDERS.has(provider)) {
    res.status(400).json({ error: "invalid_provider" });
    return;
  }
  if (!accountIdentifier || accountIdentifier.length > 320) {
    res.status(400).json({ error: "invalid_account_identifier" });
    return;
  }
  if (displayLabel != null && displayLabel.length > 120) {
    res.status(400).json({ error: "label_too_long" });
    return;
  }

  let tokenExpiresAt: Date | null = null;
  if (tokenExpiresAtRaw) {
    const parsed = new Date(tokenExpiresAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ error: "invalid_expires_at" });
      return;
    }
    tokenExpiresAt = parsed;
  }

  const created = await createSource(userId, {
    provider,
    accountIdentifier,
    displayLabel,
    accessToken,
    refreshToken,
    tokenExpiresAt,
  });

  req.log.info(
    {
      userId,
      sourceId: created.id,
      provider: created.provider,
      hasAccessToken: created.hasAccessToken,
      hasRefreshToken: created.hasRefreshToken,
    },
    "source_created",
  );

  res.status(201).json(serialize(created));
});

router.patch("/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!rawId) {
    res.status(400).json({ error: "missing_id" });
    return;
  }

  const body = req.body as Record<string, unknown> | undefined;
  if (!("displayLabel" in (body ?? {}))) {
    res.status(400).json({ error: "missing_displayLabel" });
    return;
  }
  const next = body?.displayLabel;
  if (next !== null && typeof next !== "string") {
    res.status(400).json({ error: "invalid_displayLabel" });
    return;
  }
  if (typeof next === "string" && next.length > 120) {
    res.status(400).json({ error: "label_too_long" });
    return;
  }

  const updated = await renameSource(userId, rawId, next ?? null);
  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  req.log.info({ userId, sourceId: updated.id }, "source_renamed");
  res.json(serialize(updated));
});

router.delete("/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!rawId) {
    res.status(400).json({ error: "missing_id" });
    return;
  }
  const ok = await deleteSource(userId, rawId);
  if (!ok) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  req.log.info({ userId, sourceId: rawId }, "source_disconnected");
  res.sendStatus(204);
});

export default router;
