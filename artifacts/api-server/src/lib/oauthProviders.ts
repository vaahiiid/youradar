/**
 * OAuth provider registry. Single source of truth for which providers
 * are wired, which need credentials, and which are not yet supported.
 *
 * Status meanings:
 *  - "configured":     real OAuth is wired and credentials are present.
 *                      The /api/oauth/:provider/start endpoint will
 *                      issue a real authorize URL.
 *  - "setup_required": real OAuth is wired but credentials are missing.
 *                      The /api/oauth/:provider/start endpoint returns
 *                      501 with the list of missing env vars. As soon
 *                      as the env vars are populated, the same code
 *                      path goes live with no further changes.
 *  - "coming_soon":    not wired yet (LinkedIn, Facebook, Telegram,
 *                      WhatsApp, TikTok, X, Yahoo, AOL, Hotmail,
 *                      delivery couriers). Mobile shows an honest
 *                      "API setup required" card. No fake form.
 */

export type OAuthProviderStatus =
  | "configured"
  | "setup_required"
  | "coming_soon";

export type OAuthProviderId =
  | "gmail"
  | "outlook"
  | "instagram"
  | "linkedin"
  | "facebook"
  | "telegram"
  | "whatsapp"
  | "tiktok"
  | "x"
  | "yahoo"
  | "aol"
  | "hotmail"
  | "evri"
  | "dpd"
  | "royalmail"
  | "amazon";

export interface OAuthProviderInfo {
  id: OAuthProviderId;
  label: string;
  category: "email" | "social" | "delivery";
  status: OAuthProviderStatus;
  /** Env vars required to flip the provider from setup_required → configured. */
  requiredEnv: string[];
  /** Short, end-user-visible explanation when status !== "configured". */
  setupNotes: string;
  /** Scopes the OAuth flow will request. */
  scopes: string[];
}

const env = (k: string): string => process.env[k] ?? "";

function gmailConfigured(): boolean {
  return Boolean(env("GOOGLE_OAUTH_CLIENT_ID") && env("GOOGLE_OAUTH_CLIENT_SECRET"));
}

function outlookConfigured(): boolean {
  return Boolean(env("MICROSOFT_OAUTH_CLIENT_ID") && env("MICROSOFT_OAUTH_CLIENT_SECRET"));
}

function instagramConfigured(): boolean {
  return Boolean(env("META_APP_ID") && env("META_APP_SECRET"));
}

export const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export const OUTLOOK_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "User.Read",
  "Mail.Read",
];

export const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
];

export function listProviders(): OAuthProviderInfo[] {
  return [
    {
      id: "gmail",
      label: "Gmail",
      category: "email",
      status: gmailConfigured() ? "configured" : "setup_required",
      requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
      setupNotes:
        "Awaiting Google Cloud OAuth credentials. Register an OAuth 2.0 Web Client in Google Cloud Console, add this server's /api/oauth/gmail/callback URL as an authorized redirect URI, then provide GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
      scopes: GMAIL_SCOPES,
    },
    {
      id: "outlook",
      label: "Outlook",
      category: "email",
      status: outlookConfigured() ? "configured" : "setup_required",
      requiredEnv: [
        "MICROSOFT_OAUTH_CLIENT_ID",
        "MICROSOFT_OAUTH_CLIENT_SECRET",
      ],
      setupNotes:
        "Awaiting Microsoft Azure App Registration. Register a multi-tenant app in Azure AD, add this server's /api/oauth/outlook/callback URL as a redirect URI, then provide MICROSOFT_OAUTH_CLIENT_ID and MICROSOFT_OAUTH_CLIENT_SECRET (and optionally MICROSOFT_OAUTH_TENANT — defaults to 'common').",
      scopes: OUTLOOK_SCOPES,
    },
    {
      id: "instagram",
      label: "Instagram",
      category: "social",
      status: instagramConfigured() ? "configured" : "setup_required",
      requiredEnv: ["META_APP_ID", "META_APP_SECRET"],
      setupNotes:
        "Awaiting Meta App credentials. Register a Meta app with Instagram Graph API permissions and provide META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN, and INSTAGRAM_REDIRECT_URI.",
      scopes: INSTAGRAM_SCOPES,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      category: "social",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "LinkedIn requires a registered LinkedIn Developer App and partner-program approval for the scopes YourRadar needs. Not wired yet.",
      scopes: [],
    },
    {
      id: "facebook",
      label: "Facebook",
      category: "social",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "Facebook page integration requires a Meta App with Pages permissions and Meta App Review approval. Not wired yet.",
      scopes: [],
    },
    {
      id: "telegram",
      label: "Telegram",
      category: "social",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "Telegram does not use OAuth — it uses Bot API tokens or the Telegram Login Widget. A different connection flow is required.",
      scopes: [],
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      category: "social",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "WhatsApp Business Cloud API requires a verified Meta Business account, a registered business phone number, and Meta App Review. Personal WhatsApp messages are not exposed by official APIs.",
      scopes: [],
    },
    {
      id: "tiktok",
      label: "TikTok",
      category: "social",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "TikTok requires a registered TikTok for Developers app with approved scopes. Not wired yet.",
      scopes: [],
    },
    {
      id: "x",
      label: "X",
      category: "social",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "X (Twitter) requires a paid X Developer API tier for the access we need. Not wired yet.",
      scopes: [],
    },
    {
      id: "yahoo",
      label: "Yahoo Mail",
      category: "email",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "Yahoo Mail OAuth access requires a registered Yahoo Developer app and partner approval. Not wired yet.",
      scopes: [],
    },
    {
      id: "aol",
      label: "AOL Mail",
      category: "email",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "AOL Mail does not expose a public OAuth API for inbox access. A different ingestion path is required.",
      scopes: [],
    },
    {
      id: "hotmail",
      label: "Hotmail",
      category: "email",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "Hotmail / Outlook.com personal accounts route through the Microsoft Outlook integration. Use Outlook once Microsoft OAuth credentials are configured.",
      scopes: [],
    },
    {
      id: "evri",
      label: "Evri",
      category: "delivery",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "Evri does not expose a public delivery-tracking OAuth API. Manual tracking-number entry will be supported in a future update.",
      scopes: [],
    },
    {
      id: "dpd",
      label: "DPD",
      category: "delivery",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "DPD tracking integrations require courier-business agreements. Not wired yet.",
      scopes: [],
    },
    {
      id: "royalmail",
      label: "Royal Mail",
      category: "delivery",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "Royal Mail tracking integrations require courier-business agreements. Not wired yet.",
      scopes: [],
    },
    {
      id: "amazon",
      label: "Amazon",
      category: "delivery",
      status: "coming_soon",
      requiredEnv: [],
      setupNotes:
        "Amazon SP-API requires Amazon seller-account approval. Not wired yet.",
      scopes: [],
    },
  ];
}

export function getProvider(id: string): OAuthProviderInfo | null {
  const found = listProviders().find((p) => p.id === id);
  return found ?? null;
}

/** Public base URL used for OAuth redirect_uri values registered with providers. */
export function getRedirectBaseUrl(): string {
  const explicit = process.env.OAUTH_REDIRECT_BASE_URL ?? "";
  if (explicit) return explicit.replace(/\/+$/, "");
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",").filter(Boolean);
  if (domains.length > 0) return `https://${domains[0]}`;
  return "";
}

export function getOutlookTenant(): string {
  return process.env.MICROSOFT_OAUTH_TENANT || "common";
}
