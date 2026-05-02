import { eq } from "drizzle-orm";
import {
  db,
  connectedSourcesTable,
  type ConnectedSource,
} from "@workspace/db";
import {
  decryptTokenForUser,
  encryptTokenForUser,
  type EncryptedField,
} from "./crypto";
import { upsertSyncedNotification } from "./notifications";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 90_000;
const INITIAL_DELAY_MS = 5_000;
const TOKEN_REFRESH_LEEWAY_MS = 60_000;
const GMAIL_LIST_QUERY = "in:inbox newer_than:1d";
const MAX_MESSAGES_PER_POLL = 25;

interface SyncState {
  lastPolledAt?: string;
  lastError?: string | null;
  initializedAt?: string;
}

interface GmailMessageList {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  internalDate?: string;
  snippet?: string;
  payload?: {
    headers?: { name: string; value: string }[];
  };
}

interface RefreshResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

let pollerStarted = false;
let pollerTimer: NodeJS.Timeout | null = null;
let pollInFlight = false;

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

/**
 * Returns a usable access token for the source, refreshing it via Google's
 * /token endpoint if the existing one is expired (or about to expire). On
 * refresh, persists the new encrypted token + expiry back to the row.
 * Returns null if the source cannot be refreshed (no refresh token, or
 * Google rejected the refresh).
 */
async function getValidGmailAccessToken(
  source: ConnectedSource,
): Promise<string | null> {
  if (!source.accessTokenEnc) return null;

  const expiresAt = source.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh =
    expiresAt === 0 || expiresAt - Date.now() < TOKEN_REFRESH_LEEWAY_MS;

  if (!needsRefresh) {
    return decryptTokenForUser(
      source.userId,
      source.accessTokenEnc as EncryptedField,
    );
  }

  if (!source.refreshTokenEnc) {
    logger.warn(
      { sourceId: source.id, userId: source.userId },
      "gmail_poll_skip_no_refresh_token",
    );
    return null;
  }

  const refreshToken = decryptTokenForUser(
    source.userId,
    source.refreshTokenEnc as EncryptedField,
  );

  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"] ?? "";
  const clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"] ?? "";
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  const data = (await res.json()) as RefreshResponse;
  if (!res.ok || !data.access_token) {
    logger.warn(
      {
        sourceId: source.id,
        status: res.status,
        error: data.error,
      },
      "gmail_token_refresh_failed",
    );
    // If Google says the refresh token is invalid, mark the source so
    // the user can re-connect. We don't hard-disable the row here — the
    // user can manually reconnect via the Sources screen.
    if (data.error === "invalid_grant") {
      await db
        .update(connectedSourcesTable)
        .set({
          status: "needs_reauth",
          syncState: {
            lastError: "invalid_grant",
            lastPolledAt: new Date().toISOString(),
          } satisfies SyncState,
        })
        .where(eq(connectedSourcesTable.id, source.id));
    }
    return null;
  }

  const newAccessToken = data.access_token;
  const newExpiresAt =
    typeof data.expires_in === "number" && data.expires_in > 0
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

  await db
    .update(connectedSourcesTable)
    .set({
      accessTokenEnc: encryptTokenForUser(source.userId, newAccessToken),
      // Google sometimes rotates refresh tokens; persist if returned.
      ...(typeof data.refresh_token === "string" && data.refresh_token.length > 0
        ? {
            refreshTokenEnc: encryptTokenForUser(
              source.userId,
              data.refresh_token,
            ),
          }
        : {}),
      tokenExpiresAt: newExpiresAt,
    })
    .where(eq(connectedSourcesTable.id, source.id));

  return newAccessToken;
}

// ---------------------------------------------------------------------------
// Gmail API helpers
// ---------------------------------------------------------------------------

async function gmailListMessageIds(
  accessToken: string,
): Promise<{ id: string }[]> {
  const url = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );
  url.searchParams.set("q", GMAIL_LIST_QUERY);
  url.searchParams.set("maxResults", String(MAX_MESSAGES_PER_POLL));

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`gmail_list_${res.status}`);
  const data = (await res.json()) as GmailMessageList;
  return data.messages ?? [];
}

async function gmailGetMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailMessage | null> {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`,
  );
  url.searchParams.set("format", "metadata");
  url.searchParams.append("metadataHeaders", "From");
  url.searchParams.append("metadataHeaders", "Subject");
  url.searchParams.append("metadataHeaders", "Date");

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    logger.debug(
      { status: res.status, messageId },
      "gmail_get_message_failed",
    );
    return null;
  }
  return (await res.json()) as GmailMessage;
}

interface ParsedEmail {
  subject: string;
  senderName: string | null;
  senderIdentifier: string | null;
  occurredAt: Date;
  snippet: string | null;
}

function parseHeaders(message: GmailMessage): ParsedEmail {
  const headers = message.payload?.headers ?? [];
  const get = (name: string): string | null => {
    const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return h?.value ?? null;
  };
  const fromRaw = get("From") ?? "";
  // RFC 5322-ish: "Display Name" <local@host>  OR  local@host
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(fromRaw);
  let senderName: string | null = null;
  let senderIdentifier: string | null = null;
  if (m && m[2]) {
    senderName = m[1]?.trim() || null;
    senderIdentifier = m[2].trim();
  } else if (fromRaw.includes("@")) {
    senderIdentifier = fromRaw.trim();
  }

  const internalDateMs = Number(message.internalDate ?? "0");
  const occurredAt =
    Number.isFinite(internalDateMs) && internalDateMs > 0
      ? new Date(internalDateMs)
      : new Date();

  return {
    subject: (get("Subject") ?? "(no subject)").slice(0, 500),
    senderName: senderName ? senderName.slice(0, 200) : null,
    senderIdentifier: senderIdentifier
      ? senderIdentifier.slice(0, 320)
      : null,
    occurredAt,
    snippet: message.snippet ? message.snippet.slice(0, 1000) : null,
  };
}

// ---------------------------------------------------------------------------
// Per-source poll
// ---------------------------------------------------------------------------

async function pollOneGmailSource(source: ConnectedSource): Promise<void> {
  const accessToken = await getValidGmailAccessToken(source);
  if (!accessToken) return;

  let inserted = 0;
  let conflicts = 0;
  let fetchErrors = 0;

  try {
    const ids = await gmailListMessageIds(accessToken);

    for (const { id } of ids) {
      try {
        const message = await gmailGetMessage(accessToken, id);
        if (!message) {
          fetchErrors++;
          continue;
        }
        const parsed = parseHeaders(message);
        const wasInserted = await upsertSyncedNotification(source.userId, {
          sourceId: source.id,
          provider: "gmail",
          kind: "email",
          occurredAt: parsed.occurredAt,
          title: parsed.subject,
          snippet: parsed.snippet,
          senderName: parsed.senderName,
          senderIdentifier: parsed.senderIdentifier,
          externalRef: id,
        });
        if (wasInserted) inserted++;
        else conflicts++;
      } catch (err) {
        fetchErrors++;
        logger.debug(
          { err, sourceId: source.id, messageId: id },
          "gmail_message_fetch_error",
        );
      }
    }

    await db
      .update(connectedSourcesTable)
      .set({
        syncState: {
          lastPolledAt: new Date().toISOString(),
          lastError: null,
          initializedAt:
            (source.syncState as SyncState | null)?.initializedAt ??
            new Date().toISOString(),
        } satisfies SyncState,
      })
      .where(eq(connectedSourcesTable.id, source.id));

    logger.info(
      {
        sourceId: source.id,
        userId: source.userId,
        seen: ids.length,
        inserted,
        conflicts,
        fetchErrors,
      },
      "gmail_poll_ok",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logger.warn(
      { sourceId: source.id, err: message },
      "gmail_poll_failed",
    );
    await db
      .update(connectedSourcesTable)
      .set({
        syncState: {
          lastPolledAt: new Date().toISOString(),
          lastError: message,
          initializedAt:
            (source.syncState as SyncState | null)?.initializedAt ??
            new Date().toISOString(),
        } satisfies SyncState,
      })
      .where(eq(connectedSourcesTable.id, source.id));
  }
}

// ---------------------------------------------------------------------------
// Run loop
// ---------------------------------------------------------------------------

async function runPollPass(): Promise<void> {
  // Re-entrancy guard: if a previous pass is still running (slow Google
  // response, large inbox, etc.), skip this tick rather than firing a
  // second concurrent pass that would double-hit Google's quota and
  // race on syncState updates.
  if (pollInFlight) {
    logger.debug({}, "gmail_poll_skip_in_flight");
    return;
  }
  pollInFlight = true;
  try {
    await runPollPassInner();
  } finally {
    pollInFlight = false;
  }
}

async function runPollPassInner(): Promise<void> {
  let sources: ConnectedSource[];
  try {
    sources = await db
      .select()
      .from(connectedSourcesTable)
      .where(eq(connectedSourcesTable.provider, "gmail"));
  } catch (err) {
    logger.error({ err }, "gmail_poll_db_error");
    return;
  }

  // Process sequentially to bound load on Google's quota and our DB.
  // Volume is small (one row per connected Gmail account); if this grows
  // we'll switch to a per-source schedule with concurrency control.
  for (const source of sources) {
    if (source.status !== "active") continue;
    try {
      await pollOneGmailSource(source);
    } catch (err) {
      logger.error(
        { err, sourceId: source.id },
        "gmail_poll_source_uncaught",
      );
    }
  }
}

export function startGmailPoller(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  // Skip running the worker when explicitly disabled (tests, CI).
  if (process.env["GMAIL_POLLER_DISABLED"] === "1") {
    logger.info({}, "gmail_poller_disabled_via_env");
    return;
  }

  logger.info(
    { intervalMs: POLL_INTERVAL_MS, initialDelayMs: INITIAL_DELAY_MS },
    "gmail_poller_starting",
  );

  setTimeout(() => {
    void runPollPass();
    pollerTimer = setInterval(() => {
      void runPollPass();
    }, POLL_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}

export function stopGmailPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
  }
  pollerStarted = false;
}
