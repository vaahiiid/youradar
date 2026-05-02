export type Provider = "gmail" | "outlook" | "instagram";

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
