export type Provider =
  | "gmail"
  | "outlook"
  | "instagram"
  | "linkedin"
  | "facebook"
  | "telegram"
  | "whatsapp"
  | "tiktok";

export type AccountStatus = "connected" | "needs_reauth" | "disconnected";

export type InstagramAccountKind = "business" | "creator" | "professional";

export interface ConnectedAccount {
  id: string;
  provider: Provider;
  emailAddress: string;
  displayName: string;
  status: AccountStatus;
  lastSyncAt: number;
  createdAt: number;
  notificationsEnabled: boolean;
  instagramKind?: InstagramAccountKind;
}

export type InstagramEventKind =
  | "dm"
  | "comment"
  | "mention"
  | "insight"
  | "system";

export interface EmailNotification {
  id: string;
  accountId: string;
  provider: Provider;
  emailAddress: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  bodyPreview?: string;
  receivedAt: number;
  providerWebLink?: string;
  isSeen: boolean;

  instagramEventKind?: InstagramEventKind;
  mediaThumbnailUrl?: string;
  mediaCaption?: string;
}

export interface SettingsState {
  pushEnabled: boolean;
  inAppToastsEnabled: boolean;
  soundsEnabled: boolean;
  reducedMotion: boolean;
}

export const PROVIDER_ORDER: Provider[] = [
  "gmail",
  "outlook",
  "instagram",
  "linkedin",
  "facebook",
  "telegram",
  "whatsapp",
  "tiktok",
];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
};

/**
 * Providers we have implemented mock OAuth + sample data for in this MVP.
 * The remaining providers are visible in the UI as part of the roadmap but
 * surface a "Coming soon · API setup required" hint.
 */
export const FULLY_SUPPORTED_PROVIDERS: Provider[] = ["gmail", "outlook", "instagram"];

export function isProviderImplemented(provider: Provider): boolean {
  return FULLY_SUPPORTED_PROVIDERS.includes(provider);
}
