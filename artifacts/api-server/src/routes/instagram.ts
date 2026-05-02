import crypto from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { requireUser } from "../middlewares/auth";
import { ensureUser } from "../lib/users";
import { createSource } from "../lib/sources";
import { maskToken } from "../lib/crypto";

const router: IRouter = Router();

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN ?? "";
const META_APP_SECRET = process.env.META_APP_SECRET ?? "";
const META_APP_ID = process.env.META_APP_ID ?? "";
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI ?? "";
const GRAPH_API_VERSION = process.env.INSTAGRAM_GRAPH_API_VERSION ?? "v20.0";

function isConfigured() {
  return Boolean(META_APP_ID && META_APP_SECRET && META_VERIFY_TOKEN);
}

router.get("/healthz", (_req, res) => {
  res.json({
    configured: isConfigured(),
    graphVersion: GRAPH_API_VERSION,
    hasAppId: Boolean(META_APP_ID),
    hasAppSecret: Boolean(META_APP_SECRET),
    hasVerifyToken: Boolean(META_VERIFY_TOKEN),
    hasRedirectUri: Boolean(INSTAGRAM_REDIRECT_URI),
  });
});

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!META_VERIFY_TOKEN) {
    req.log.warn(
      "Instagram webhook verification attempted without META_VERIFY_TOKEN configured",
    );
    res.status(503).send("not configured");
    return;
  }

  if (
    mode === "subscribe" &&
    token === META_VERIFY_TOKEN &&
    typeof challenge === "string"
  ) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

function verifySignature(req: Request, rawBody: Buffer): boolean {
  if (!META_APP_SECRET) return false;
  const header = req.header("x-hub-signature-256");
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", META_APP_SECRET)
    .update(rawBody)
    .digest("hex");
  const provided = header.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(provided, "hex"),
    );
  } catch {
    return false;
  }
}

router.post("/webhook", (req, res) => {
  if (!isConfigured()) {
    req.log.warn(
      "Instagram webhook received but Meta credentials are not configured",
    );
    res.status(503).json({ ok: false, reason: "not_configured" });
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody || !verifySignature(req, rawBody)) {
    req.log.warn("Instagram webhook received with invalid signature");
    res.sendStatus(403);
    return;
  }

  const body = req.body as {
    object?: string;
    entry?: Array<{
      id?: string;
      time?: number;
      changes?: Array<{ field?: string; value?: unknown }>;
      messaging?: Array<unknown>;
    }>;
  };

  if (!body || body.object !== "instagram") {
    res.sendStatus(404);
    return;
  }

  // NOTE: Webhook content is not yet routed to a specific user. When notification
  // ingestion is wired up, fields must be encrypted via createNotification(userId,
  // {...}) before persistence. Logging here intentionally records only counts +
  // accountIds (provider-side opaque IDs), never message content.
  const events: Array<{ accountId?: string; field?: string; kind: string }> = [];
  for (const entry of body.entry ?? []) {
    if (entry.changes) {
      for (const change of entry.changes) {
        events.push({
          accountId: entry.id,
          field: change.field,
          kind:
            change.field === "comments"
              ? "comment"
              : change.field === "mentions"
                ? "mention"
                : "system",
        });
      }
    }
    if (entry.messaging) {
      events.push({ accountId: entry.id, kind: "dm" });
    }
  }

  req.log.info(
    { eventCount: events.length, kinds: events.map((e) => e.kind) },
    "Instagram webhook events received",
  );

  res.status(200).json({ ok: true, accepted: events.length });
});

const STATE_TTL_MS = 10 * 60 * 1000;
type StateEntry = { userId: string; expires: number };
const oauthStates = new Map<string, StateEntry>();

function pruneStates() {
  const now = Date.now();
  for (const [s, entry] of oauthStates) {
    if (entry.expires < now) oauthStates.delete(s);
  }
}

function issueState(userId: string): string {
  pruneStates();
  const state = crypto.randomBytes(24).toString("hex");
  oauthStates.set(state, { userId, expires: Date.now() + STATE_TTL_MS });
  return state;
}

function consumeState(state: string): string | null {
  pruneStates();
  const entry = oauthStates.get(state);
  if (!entry || entry.expires < Date.now()) return null;
  oauthStates.delete(state);
  return entry.userId;
}

router.get("/oauth/start", requireUser, async (req, res): Promise<void> => {
  if (!isConfigured() || !INSTAGRAM_REDIRECT_URI) {
    res.status(503).json({
      ok: false,
      reason: "not_configured",
      message:
        "Instagram OAuth requires META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN, and INSTAGRAM_REDIRECT_URI to be configured.",
    });
    return;
  }

  const userId = req.userId!;
  await ensureUser(userId);

  const scope = [
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",");

  const state = issueState(userId);
  const url = new URL(
    "https://www.facebook.com/" + GRAPH_API_VERSION + "/dialog/oauth",
  );
  url.searchParams.set("client_id", META_APP_ID);
  url.searchParams.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  res.json({ ok: true, authorizeUrl: url.toString(), state });
});

router.get("/oauth/callback", async (req, res): Promise<void> => {
  if (!isConfigured() || !INSTAGRAM_REDIRECT_URI) {
    res.status(503).json({ ok: false, reason: "not_configured" });
    return;
  }

  const code = req.query.code;
  const state = req.query.state;

  if (typeof state !== "string") {
    res.status(400).json({ ok: false, reason: "missing_state" });
    return;
  }
  const userId = consumeState(state);
  if (!userId) {
    req.log.warn("Instagram OAuth callback received with missing or invalid state");
    res.status(400).json({ ok: false, reason: "invalid_state" });
    return;
  }

  if (typeof code !== "string") {
    res.status(400).json({ ok: false, reason: "missing_code" });
    return;
  }

  try {
    const tokenUrl = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
    );
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    if (!tokenRes.ok) {
      req.log.warn(
        { status: tokenRes.status },
        "Instagram OAuth token exchange failed",
      );
      res.status(502).json({ ok: false, reason: "token_exchange_failed" });
      return;
    }
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      token_type?: string;
    };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      req.log.warn("Instagram OAuth response did not contain access_token");
      res.status(502).json({ ok: false, reason: "no_token" });
      return;
    }

    let accountIdentifier = `instagram:${userId.slice(0, 8)}:${Date.now()}`;
    try {
      const meRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (meRes.ok) {
        const me = (await meRes.json()) as { id?: string; name?: string };
        if (typeof me.name === "string" && me.name.length > 0) {
          accountIdentifier = me.name;
        } else if (typeof me.id === "string") {
          accountIdentifier = `meta:${me.id}`;
        }
      }
    } catch {
      // identity lookup is best-effort; account_identifier falls back to placeholder
    }

    const tokenExpiresAt =
      typeof tokenData.expires_in === "number" && tokenData.expires_in > 0
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

    const created = await createSource(userId, {
      provider: "instagram",
      accountIdentifier,
      displayLabel: null,
      accessToken,
      refreshToken: null,
      tokenExpiresAt,
    });

    req.log.info(
      {
        userId,
        sourceId: created.id,
        provider: created.provider,
        token: maskToken(accessToken),
        tokenExpiresAt,
      },
      "instagram_oauth_persisted",
    );

    res.json({
      ok: true,
      sourceId: created.id,
      message:
        "Connected. The provider token is stored encrypted server-side and never exposed to the frontend.",
    });
  } catch (err) {
    req.log.error({ err }, "Instagram OAuth callback error");
    res.status(500).json({ ok: false, reason: "callback_error" });
  }
});

export default router;
