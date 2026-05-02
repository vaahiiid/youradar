import crypto from "node:crypto";
import { Router, type IRouter, type Request } from "express";

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
    req.log.warn("Instagram webhook verification attempted without META_VERIFY_TOKEN configured");
    res.status(503).send("not configured");
    return;
  }

  if (mode === "subscribe" && token === META_VERIFY_TOKEN && typeof challenge === "string") {
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
    req.log.warn("Instagram webhook received but Meta credentials are not configured");
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

  const events: Array<{ accountId?: string; field?: string; kind: string }> = [];
  for (const entry of body.entry ?? []) {
    if (entry.changes) {
      for (const change of entry.changes) {
        events.push({
          accountId: entry.id,
          field: change.field,
          kind: change.field === "comments" ? "comment" : change.field === "mentions" ? "mention" : "system",
        });
      }
    }
    if (entry.messaging) {
      events.push({ accountId: entry.id, kind: "dm" });
    }
  }

  req.log.info({ events }, "Instagram webhook events received");

  res.status(200).json({ ok: true, accepted: events.length });
});

const STATE_TTL_MS = 10 * 60 * 1000;
const oauthStates = new Map<string, number>();

function pruneStates() {
  const now = Date.now();
  for (const [s, exp] of oauthStates) {
    if (exp < now) oauthStates.delete(s);
  }
}

function issueState(): string {
  pruneStates();
  const state = crypto.randomBytes(24).toString("hex");
  oauthStates.set(state, Date.now() + STATE_TTL_MS);
  return state;
}

function consumeState(state: string): boolean {
  pruneStates();
  const expiry = oauthStates.get(state);
  if (!expiry || expiry < Date.now()) return false;
  oauthStates.delete(state);
  return true;
}

router.get("/oauth/start", (req, res) => {
  if (!isConfigured() || !INSTAGRAM_REDIRECT_URI) {
    res.status(503).json({
      ok: false,
      reason: "not_configured",
      message:
        "Instagram OAuth requires META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN, and INSTAGRAM_REDIRECT_URI to be configured.",
    });
    return;
  }

  const scope = [
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",");

  const state = issueState();
  const url = new URL("https://www.facebook.com/" + GRAPH_API_VERSION + "/dialog/oauth");
  url.searchParams.set("client_id", META_APP_ID);
  url.searchParams.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  res.json({ ok: true, authorizeUrl: url.toString(), state });
});

router.get("/oauth/callback", async (req, res) => {
  if (!isConfigured() || !INSTAGRAM_REDIRECT_URI) {
    res.status(503).json({ ok: false, reason: "not_configured" });
    return;
  }

  const code = req.query.code;
  const state = req.query.state;

  if (typeof state !== "string" || !consumeState(state)) {
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
      req.log.warn({ status: tokenRes.status }, "Instagram OAuth token exchange failed");
      res.status(502).json({ ok: false, reason: "token_exchange_failed" });
      return;
    }

    res.json({
      ok: true,
      message:
        "Token received. Persist server-side only and exchange for a long-lived token. Never expose to the client.",
    });
  } catch (err) {
    req.log.error({ err }, "Instagram OAuth callback error");
    res.status(500).json({ ok: false, reason: "callback_error" });
  }
});

export default router;
