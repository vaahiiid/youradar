export type Provider = "gmail" | "outlook";

export type AccountStatus = "connected" | "needs_reauth" | "disconnected";

export interface ConnectedAccount {
  id: string;
  provider: Provider;
  emailAddress: string;
  displayName: string;
  status: AccountStatus;
  lastSyncAt: number;
  createdAt: number;
}

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
}

export interface SettingsState {
  pushEnabled: boolean;
  inAppToastsEnabled: boolean;
  soundsEnabled: boolean;
}
