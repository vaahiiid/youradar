export type Provider =
  | "gmail"
  | "outlook"
  | "yahoo"
  | "aol"
  | "hotmail"
  | "instagram"
  | "linkedin"
  | "facebook"
  | "telegram"
  | "whatsapp"
  | "tiktok"
  | "x"
  | "evri"
  | "dpd"
  | "royalmail"
  | "amazon";

export type ProviderCategory = "email" | "social" | "delivery";

export type AccountStatus = "connected" | "needs_reauth" | "disconnected";

export type InstagramAccountKind = "business" | "creator" | "professional";

export type DeliveryStatus =
  | "added"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delayed"
  | "exception"
  | "unknown";

export interface DeliveryDetails {
  trackingNumber: string;
  label: string;
  merchant?: string;
  expectedAt?: number;
  status: DeliveryStatus;
  lastCheckedAt: number;
  publicTrackingUrl?: string;
}

export interface ConnectedAccount {
  id: string;
  provider: Provider;
  /**
   * For email/social this is the address or handle. For delivery providers
   * this is the masked tracking number.
   */
  emailAddress: string;
  displayName: string;
  status: AccountStatus;
  lastSyncAt: number;
  createdAt: number;
  notificationsEnabled: boolean;
  instagramKind?: InstagramAccountKind;
  /** Present only on delivery-provider accounts. */
  deliveryDetails?: DeliveryDetails;
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

  /** Present on delivery notifications — the new status that triggered the alert. */
  deliveryStatus?: DeliveryStatus;
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
  "yahoo",
  "aol",
  "hotmail",
  "instagram",
  "linkedin",
  "facebook",
  "telegram",
  "whatsapp",
  "tiktok",
  "x",
  "evri",
  "dpd",
  "royalmail",
  "amazon",
];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  yahoo: "Yahoo Mail",
  aol: "AOL Mail",
  hotmail: "Hotmail",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  x: "X",
  evri: "Evri",
  dpd: "DPD",
  royalmail: "Royal Mail",
  amazon: "Amazon",
};

export const PROVIDER_CATEGORY: Record<Provider, ProviderCategory> = {
  gmail: "email",
  outlook: "email",
  yahoo: "email",
  aol: "email",
  hotmail: "email",
  instagram: "social",
  linkedin: "social",
  facebook: "social",
  telegram: "social",
  whatsapp: "social",
  tiktok: "social",
  x: "social",
  evri: "delivery",
  dpd: "delivery",
  royalmail: "delivery",
  amazon: "delivery",
};

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  email: "Email",
  social: "Social",
  delivery: "Deliveries",
};

export function providersInCategory(category: ProviderCategory): Provider[] {
  return PROVIDER_ORDER.filter((p) => PROVIDER_CATEGORY[p] === category);
}

export function isEmailProvider(p: Provider): boolean {
  return PROVIDER_CATEGORY[p] === "email";
}

export function isSocialProvider(p: Provider): boolean {
  return PROVIDER_CATEGORY[p] === "social";
}

export function isDeliveryProvider(p: Provider): boolean {
  return PROVIDER_CATEGORY[p] === "delivery";
}

/**
 * In this MVP build every provider has mock OAuth + sample data so users can
 * try the experience end-to-end. The "API setup required" hint surfaces in
 * the connect sheet for providers that require additional production wiring
 * (developer review, business app approval, courier API contracts, etc).
 */
export const FULLY_SUPPORTED_PROVIDERS: Provider[] = [
  "gmail",
  "outlook",
  "instagram",
];

export function isProviderImplemented(provider: Provider): boolean {
  return FULLY_SUPPORTED_PROVIDERS.includes(provider);
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  added: "Added",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delayed: "Delayed",
  exception: "Exception",
  unknown: "Unknown",
};

export function maskTrackingNumber(trackingNumber: string): string {
  const t = trackingNumber.trim();
  if (t.length <= 6) return t;
  return `${t.slice(0, 3)}…${t.slice(-3)}`;
}
