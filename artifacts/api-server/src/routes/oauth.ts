import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { requireUser } from "../middlewares/auth";
import { ensureUser } from "../lib/users";
import { createSource } from "../lib/sources";
import { maskToken } from "../lib/crypto";
import {
  getOutlookTenant,
  getProvider,
  getRedirectBaseUrl,
  listProviders,
  type OAuthProviderInfo,
} from "../lib/oauthProviders";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// State store: maps short opaque state token → { userId, returnUrl, provider }
// In-memory with TTL. Same pattern as instagram.ts. For multi-instance
// deployments this should move to a shared store (Redis / DB).
// ---------------------------------------------------------------------------
const STATE_TTL_MS = 10 * 60 * 1000;
type StateEntry = {
  userId: string;
  returnUrl: string;
  provider: string;
  expires: number;
};
const oauthStates = new Map<string, StateEntry>();

function pruneStates(): void {
  const now = Date.now();
  for (const [s, entry] of oauthStates) {
    if (entry.expires < now) oauthStates.delete(s);
  }
}

function issueState(
  userId: string,
  returnUrl: string,
  provider: string,
): string {
  pruneStates();
  const state = crypto.randomBytes(24).toString("hex");
  oauthStates.set(state, {
    userId,
    returnUrl,
    provider,
    expires: Date.now() + STATE_TTL_MS,
  });
  return state;
}

function consumeState(state: string): StateEntry | null {
  pruneStates();
  const entry = oauthStates.get(state);
  if (!entry || entry.expires < Date.now()) return null;
  oauthStates.delete(state);
  return entry;
}

// ---------------------------------------------------------------------------
// Public catalog
// ---------------------------------------------------------------------------
router.get("/providers", (_req, res) => {
  const providers = listProviders().map((p) => ({
    id: p.id,
    label: p.label,
    category: p.category,
    status: p.status,
    setupNotes: p.setupNotes,
    requiredEnv: p.requiredEnv,
  }));
  res.json({ providers });
});

// ---------------------------------------------------------------------------
// Helpers — provider-specific authorize-URL builders. These all return a
// fully-formed authorize URL. They are only invoked when the provider's
// status === "configured".
// ---------------------------------------------------------------------------
function buildGmailAuthorizeUrl(
  provider: OAuthProviderInfo,
  state: string,
  redirectUri: string,
): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_OAUTH_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

function buildOutlookAuthorizeUrl(
  provider: OAuthProviderInfo,
  state: string,
  redirectUri: string,
): string {
  const tenant = getOutlookTenant();
  const url = new URL(
    `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`,
  );
  url.searchParams.set(
    "client_id",
    process.env.MICROSOFT_OAUTH_CLIENT_ID ?? "",
  );
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", provider.scopes.join(" "));
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

function buildInstagramAuthorizeUrl(
  provider: OAuthProviderInfo,
  state: string,
  redirectUri: string,
): string {
  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION ?? "v20.0";
  const url = new URL(
    `https://www.facebook.com/${apiVersion}/dialog/oauth`,
  );
  url.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scopes.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

function redirectUriFor(providerId: string): string {
  const base = getRedirectBaseUrl();
  if (!base) return "";
  return `${base}/api/oauth/${providerId}/callback`;
}

// ---------------------------------------------------------------------------
// Start: POST /api/oauth/:provider/start
// Body: { returnUrl: string }
// Returns: { authorizeUrl } on success, 501 on setup_required, 409 on coming_soon.
// ---------------------------------------------------------------------------
function isAllowedReturnUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const protocol = parsed.protocol.toLowerCase();
    // Allow http(s) for web, plus mobile / Expo deep-link schemes.
    const allowedSchemes = new Set([
      "http:",
      "https:",
      "exp:",
      "exps:",
      "yourradar:",
      "myradar:",
      "inboxpulse:",
    ]);
    if (allowedSchemes.has(protocol)) return true;
    // Expo dev custom scheme: exp+something:
    if (protocol.startsWith("exp+")) return true;
    return false;
  } catch {
    return false;
  }
}

router.post(
  "/:provider/start",
  requireUser,
  async (req, res): Promise<void> => {
    const rawProvider = req.params.provider;
    const providerId = Array.isArray(rawProvider)
      ? (rawProvider[0] ?? "")
      : (rawProvider ?? "");
    const provider = getProvider(providerId);
    if (!provider) {
      res.status(404).json({ ok: false, reason: "unknown_provider" });
      return;
    }

    if (provider.status === "coming_soon") {
      res.status(409).json({
        ok: false,
        reason: "coming_soon",
        provider: provider.id,
        message: provider.setupNotes,
      });
      return;
    }

    if (provider.status === "setup_required") {
      res.status(501).json({
        ok: false,
        reason: "not_configured",
        provider: provider.id,
        requiredEnv: provider.requiredEnv,
        message: provider.setupNotes,
      });
      return;
    }

    const body = (req.body ?? {}) as { returnUrl?: unknown };
    const returnUrl =
      typeof body.returnUrl === "string" ? body.returnUrl : "";
    if (!returnUrl) {
      res.status(400).json({ ok: false, reason: "missing_return_url" });
      return;
    }
    // Open-redirect guard: only allow our own deep-link scheme, http(s),
    // or expo-go / exp+ for development. Anything else is rejected so the
    // OAuth callback can never bounce a user to an arbitrary site.
    if (!isAllowedReturnUrl(returnUrl)) {
      res.status(400).json({ ok: false, reason: "invalid_return_url" });
      return;
    }

    const redirectUri = redirectUriFor(provider.id);
    if (!redirectUri) {
      res.status(503).json({
        ok: false,
        reason: "missing_redirect_base",
        message:
          "Server has no public base URL for OAuth redirects. Set OAUTH_REDIRECT_BASE_URL or REPLIT_DOMAINS.",
      });
      return;
    }

    const userId = req.userId!;
    await ensureUser(userId);

    const state = issueState(userId, returnUrl, provider.id);

    let authorizeUrl: string;
    switch (provider.id) {
      case "gmail":
        authorizeUrl = buildGmailAuthorizeUrl(provider, state, redirectUri);
        break;
      case "outlook":
        authorizeUrl = buildOutlookAuthorizeUrl(provider, state, redirectUri);
        break;
      case "instagram":
        authorizeUrl = buildInstagramAuthorizeUrl(provider, state, redirectUri);
        break;
      default:
        res.status(500).json({
          ok: false,
          reason: "unsupported",
          message: `Provider ${provider.id} is marked configured but no authorize URL builder is registered.`,
        });
        return;
    }

    req.log.info(
      { userId, provider: provider.id },
      "oauth_start_issued",
    );
    res.json({ ok: true, authorizeUrl, state });
  },
);

// ---------------------------------------------------------------------------
// Token exchange helpers
// ---------------------------------------------------------------------------
interface ExchangeResult {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  accountIdentifier: string;
}

async function exchangeGmail(
  code: string,
  redirectUri: string,
): Promise<ExchangeResult> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!tokenRes.ok) throw new Error(`gmail_token_exchange_failed_${tokenRes.status}`);
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tokenData.access_token) throw new Error("gmail_no_access_token");

  let accountIdentifier = "gmail-account";
  try {
    const meRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { authorization: `Bearer ${tokenData.access_token}` } },
    );
    if (meRes.ok) {
      const me = (await meRes.json()) as { email?: string; id?: string };
      if (typeof me.email === "string" && me.email.length > 0) {
        accountIdentifier = me.email;
      } else if (typeof me.id === "string") {
        accountIdentifier = `google:${me.id}`;
      }
    }
  } catch {
    // best-effort identity lookup
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    tokenExpiresAt:
      typeof tokenData.expires_in === "number" && tokenData.expires_in > 0
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
    accountIdentifier,
  };
}

async function exchangeOutlook(
  code: string,
  redirectUri: string,
): Promise<ExchangeResult> {
  const tenant = getOutlookTenant();
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    },
  );
  if (!tokenRes.ok) throw new Error(`outlook_token_exchange_failed_${tokenRes.status}`);
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tokenData.access_token) throw new Error("outlook_no_access_token");

  let accountIdentifier = "outlook-account";
  try {
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { authorization: `Bearer ${tokenData.access_token}` },
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        userPrincipalName?: string;
        mail?: string;
        id?: string;
      };
      const candidate = me.mail || me.userPrincipalName;
      if (typeof candidate === "string" && candidate.length > 0) {
        accountIdentifier = candidate;
      } else if (typeof me.id === "string") {
        accountIdentifier = `microsoft:${me.id}`;
      }
    }
  } catch {
    // best-effort
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    tokenExpiresAt:
      typeof tokenData.expires_in === "number" && tokenData.expires_in > 0
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
    accountIdentifier,
  };
}

async function exchangeInstagram(
  code: string,
  redirectUri: string,
): Promise<ExchangeResult> {
  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION ?? "v20.0";
  const tokenUrl = new URL(
    `https://graph.facebook.com/${apiVersion}/oauth/access_token`,
  );
  tokenUrl.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET ?? "");
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);
  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) throw new Error(`instagram_token_exchange_failed_${tokenRes.status}`);
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!tokenData.access_token) throw new Error("instagram_no_access_token");

  let accountIdentifier = "instagram-account";
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/me?fields=id,name&access_token=${encodeURIComponent(tokenData.access_token)}`,
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
    // best-effort
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: null,
    tokenExpiresAt:
      typeof tokenData.expires_in === "number" && tokenData.expires_in > 0
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
    accountIdentifier,
  };
}

// ---------------------------------------------------------------------------
// Callback: GET /api/oauth/:provider/callback?code=...&state=...
// Exchanges code → tokens, persists ConnectedSource, then redirects the
// browser back to the mobile app's returnUrl with status params.
// ---------------------------------------------------------------------------
function redirectToReturnUrl(
  res: import("express").Response,
  returnUrl: string,
  params: Record<string, string>,
): void {
  try {
    const url = new URL(returnUrl);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    res.redirect(url.toString());
  } catch {
    // returnUrl wasn't a valid URL — fall back to a JSON response.
    res.json({ ok: params.status === "ok", ...params });
  }
}

router.get("/:provider/callback", async (req, res): Promise<void> => {
  const rawProvider = req.params.provider;
  const providerId = Array.isArray(rawProvider)
    ? (rawProvider[0] ?? "")
    : (rawProvider ?? "");
  const provider = getProvider(providerId);
  if (!provider) {
    res.status(404).json({ ok: false, reason: "unknown_provider" });
    return;
  }

  if (provider.status !== "configured") {
    res.status(503).json({
      ok: false,
      reason: "not_configured",
      provider: provider.id,
    });
    return;
  }

  const code = req.query.code;
  const state = req.query.state;
  const errorParam = req.query.error;

  if (typeof state !== "string") {
    res.status(400).json({ ok: false, reason: "missing_state" });
    return;
  }
  const entry = consumeState(state);
  if (!entry || entry.provider !== provider.id) {
    req.log.warn(
      { provider: provider.id },
      "oauth_callback_invalid_state",
    );
    res.status(400).json({ ok: false, reason: "invalid_state" });
    return;
  }

  if (typeof errorParam === "string" && errorParam.length > 0) {
    redirectToReturnUrl(res, entry.returnUrl, {
      provider: provider.id,
      status: "error",
      reason: errorParam,
    });
    return;
  }

  if (typeof code !== "string") {
    redirectToReturnUrl(res, entry.returnUrl, {
      provider: provider.id,
      status: "error",
      reason: "missing_code",
    });
    return;
  }

  const redirectUri = redirectUriFor(provider.id);

  try {
    let result: ExchangeResult;
    switch (provider.id) {
      case "gmail":
        result = await exchangeGmail(code, redirectUri);
        break;
      case "outlook":
        result = await exchangeOutlook(code, redirectUri);
        break;
      case "instagram":
        result = await exchangeInstagram(code, redirectUri);
        break;
      default:
        redirectToReturnUrl(res, entry.returnUrl, {
          provider: provider.id,
          status: "error",
          reason: "unsupported",
        });
        return;
    }

    const created = await createSource(entry.userId, {
      provider: provider.id,
      accountIdentifier: result.accountIdentifier,
      displayLabel: null,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpiresAt: result.tokenExpiresAt,
    });

    req.log.info(
      {
        userId: entry.userId,
        sourceId: created.id,
        provider: created.provider,
        token: maskToken(result.accessToken),
        tokenExpiresAt: result.tokenExpiresAt,
      },
      "oauth_source_persisted",
    );

    redirectToReturnUrl(res, entry.returnUrl, {
      provider: provider.id,
      status: "ok",
      account: result.accountIdentifier,
      sourceId: created.id,
    });
  } catch (err) {
    req.log.error({ err, provider: provider.id }, "oauth_callback_error");
    redirectToReturnUrl(res, entry.returnUrl, {
      provider: provider.id,
      status: "error",
      reason: "callback_error",
    });
  }
});

export default router;
