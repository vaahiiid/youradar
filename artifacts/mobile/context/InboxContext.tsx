import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  PROVIDER_ORDER,
  isDeliveryProvider,
  type ConnectedAccount,
  type DeliveryDetails,
  type DeliveryStatus,
  type EmailNotification,
  type InstagramEventKind,
  type Provider,
  type SettingsState,
} from "@/types";
import { uid } from "@/utils/format";

const STORAGE_KEY = "yourradar_state_v4";
const LEGACY_STORAGE_KEYS = ["yourradar_state_v3"];

interface PersistedState {
  accounts: ConnectedAccount[];
  notifications: EmailNotification[];
  settings: SettingsState;
}

export type ConnectAccountResult =
  | { status: "created"; account: ConnectedAccount }
  | { status: "duplicate"; account: ConnectedAccount }
  | { status: "invalid"; reason: string };

interface DeliveryInput {
  trackingNumber: string;
  label: string;
  merchant?: string;
  expectedAt?: number;
  notificationsEnabled?: boolean;
}

interface InboxContextValue {
  ready: boolean;
  accounts: ConnectedAccount[];
  notifications: EmailNotification[];
  settings: SettingsState;
  unseenTotal: number;
  unseenByAccount: Record<string, number>;
  unseenByProvider: Record<Provider, number>;
  /** Providers that have at least one connected account on this device. */
  connectedProviders: Provider[];
  /** Providers we have full mock OAuth + sample data for in the MVP. */
  fullyConfiguredProviders: Provider[];
  connectAccount: (
    provider: Provider,
    handleOrEmail: string,
    extras?: {
      instagramKind?: ConnectedAccount["instagramKind"];
      nickname?: string;
    },
  ) => ConnectAccountResult;
  addDelivery: (provider: Provider, details: DeliveryInput) => ConnectedAccount;
  disconnectAccount: (accountId: string) => void;
  reconnectAccount: (accountId: string) => void;
  renameAccount: (accountId: string, displayName: string) => void;
  toggleAccountNotifications: (accountId: string) => void;
  simulateIncoming: (
    provider: Provider,
    accountId?: string,
    instagramEventKind?: InstagramEventKind,
  ) => EmailNotification | null;
  markSeen: (id: string) => void;
  markAllSeen: () => void;
  clearAll: () => void;
  updateSettings: (patch: Partial<SettingsState>) => void;
  getNotification: (id: string) => EmailNotification | undefined;
  getAccount: (id: string) => ConnectedAccount | undefined;
}

const InboxContext = createContext<InboxContextValue | null>(null);

const EMAIL_SAMPLES: { name: string; email: string; subject: string; snippet: string; body: string }[] = [
  {
    name: "Linear",
    email: "notifications@linear.app",
    subject: "New comment on ENG-432",
    snippet: "Sara: I think we should ship this behind a feature flag and then…",
    body: "Sara replied on the ticket: I think we should ship this behind a feature flag and then graduate it next week once we've validated the metrics on the staging cohort.",
  },
  {
    name: "Stripe",
    email: "receipts@stripe.com",
    subject: "Your receipt from Acme Inc.",
    snippet: "Thanks for your payment of $49.00 USD. View invoice or manage…",
    body: "Thanks for your payment of $49.00 USD. View invoice or manage your billing in the Stripe dashboard.",
  },
  {
    name: "GitHub",
    email: "noreply@github.com",
    subject: "[repo] PR #1284 ready for review",
    snippet: "@you was requested as a reviewer on pull request #1284 in repo…",
    body: "@you was requested as a reviewer on pull request #1284 'Refactor notification fan-out' in your repository.",
  },
  {
    name: "Calendar",
    email: "calendar-noreply@google.com",
    subject: "Reminder: Standup at 10:00 AM",
    snippet: "This is a reminder that 'Standup' starts in 15 minutes. Join the…",
    body: "This is a reminder that 'Standup' starts in 15 minutes. Join the meeting from your Calendar event.",
  },
  {
    name: "Maya Lin",
    email: "maya@designstudio.co",
    subject: "Quick thought on the onboarding flow",
    snippet: "Hey — looking at the prototype again and I'm wondering if we…",
    body: "Hey — looking at the prototype again and I'm wondering if we should split the permission ask into a separate step. WDYT?",
  },
  {
    name: "Notion",
    email: "team@mail.notion.so",
    subject: "Weekly digest: 12 updates in your workspace",
    snippet: "Catch up on what changed across your shared docs this week…",
    body: "Catch up on what changed across your shared docs this week. 12 updates from 4 collaborators are waiting.",
  },
];

interface InstagramSample {
  senderName: string;
  senderHandle: string;
  subject: string;
  snippet: string;
  body: string;
  thumbnail?: string;
  caption?: string;
}

const INSTAGRAM_SAMPLES: Record<InstagramEventKind, InstagramSample[]> = {
  dm: [
    {
      senderName: "Jules Park",
      senderHandle: "@julespark",
      subject: "New direct message",
      snippet: "Hey! Loved your latest post — quick question about the gear you used…",
      body: "Hey! Loved your latest post — quick question about the gear you used for that golden hour shot. Mind sharing?",
    },
    {
      senderName: "Studio Eleven",
      senderHandle: "@studio.eleven",
      subject: "New direct message",
      snippet: "Following up on the collab brief we sent over last week — let me know…",
      body: "Following up on the collab brief we sent over last week — let me know if you've had a chance to review it. Happy to jump on a quick call.",
    },
  ],
  comment: [
    {
      senderName: "Anika R.",
      senderHandle: "@anika.r",
      subject: "New comment on your post",
      snippet: "This composition is incredible 🤩 what lens?",
      body: "This composition is incredible 🤩 what lens?",
      caption: "Foggy morning at the harbor • shot on the new prime",
    },
    {
      senderName: "Theo Vance",
      senderHandle: "@theo.vance",
      subject: "New comment on your reel",
      snippet: "Saved this one. Tutorial when?? 🙏",
      body: "Saved this one. Tutorial when?? 🙏",
      caption: "30s edit walkthrough — let me know if you want the full version",
    },
  ],
  mention: [
    {
      senderName: "Kai Nakamura",
      senderHandle: "@kai.nakamura",
      subject: "You were mentioned in a story",
      snippet: "Mentioned you in their story — tap to view before it disappears.",
      body: "Kai mentioned you in a story. Stories disappear after 24 hours, so tap through soon to see it.",
    },
    {
      senderName: "Local Roasters",
      senderHandle: "@localroasters",
      subject: "You were mentioned in a post",
      snippet: "Big thanks to @you for the photos last weekend! 📸",
      body: "Big thanks to @you for the photos last weekend! 📸 Swipe to see the whole set.",
    },
  ],
  insight: [
    {
      senderName: "Instagram Insights",
      senderHandle: "@instagram",
      subject: "Your reach is up 38% this week",
      snippet: "Your content reached 12,400 accounts in the last 7 days, up 38% week-over-week.",
      body: "Your content reached 12,400 accounts in the last 7 days, up 38% week-over-week. Top-performing post: 'Foggy morning at the harbor.'",
    },
    {
      senderName: "Instagram Insights",
      senderHandle: "@instagram",
      subject: "New milestone: 10K followers",
      snippet: "You just crossed 10,000 followers. Tap to see your top fans.",
      body: "You just crossed 10,000 followers — congratulations. Tap to see your top fans and most engaged moments.",
    },
  ],
  system: [
    {
      senderName: "Instagram",
      senderHandle: "@instagram",
      subject: "Login from a new device",
      snippet: "We noticed a login from Chrome on macOS in San Francisco, US.",
      body: "We noticed a login from Chrome on macOS in San Francisco, US. If this was you, ignore this. If not, secure your account.",
    },
  ],
};

const INSTAGRAM_LABELS: Record<InstagramEventKind, string> = {
  dm: "Direct message",
  comment: "Comment",
  mention: "Mention",
  insight: "Insights",
  system: "Account alert",
};

export function getInstagramEventLabel(kind: InstagramEventKind): string {
  return INSTAGRAM_LABELS[kind];
}

interface SocialSample {
  senderName: string;
  senderHandle: string;
  subject: string;
  snippet: string;
  body: string;
  link: (handle: string) => string;
}

const SOCIAL_SAMPLES: Record<
  "linkedin" | "facebook" | "telegram" | "whatsapp" | "tiktok" | "x",
  SocialSample[]
> = {
  linkedin: [
    {
      senderName: "Priya Mehta",
      senderHandle: "Recruiter at Stripe",
      subject: "New connection request",
      snippet: "Hi! I came across your profile and wanted to connect about a Senior PM role…",
      body: "Hi! I came across your profile and wanted to connect about a Senior PM role on the Atlas team. Open to a quick chat next week?",
      link: () => "https://www.linkedin.com/messaging/",
    },
    {
      senderName: "LinkedIn",
      senderHandle: "Engagement",
      subject: "Your post is performing 4x your average",
      snippet: "Your post on Notification UX has 1,240 impressions in the first 6 hours.",
      body: "Your post on 'Designing notification systems that respect attention' has 1,240 impressions and 38 reactions in its first 6 hours — 4x your account average.",
      link: () => "https://www.linkedin.com/feed/",
    },
  ],
  facebook: [
    {
      senderName: "Jordan Reyes",
      senderHandle: "Visitor on Acme Page",
      subject: "New message to your Page",
      snippet: "Hi! Are you open this weekend? Wanted to drop by with a friend.",
      body: "Hi! Are you open this weekend? Wanted to drop by with a friend.",
      link: () => "https://business.facebook.com/latest/inbox/",
    },
    {
      senderName: "Acme Page",
      senderHandle: "Page activity",
      subject: "3 new comments on your latest post",
      snippet: "Your post 'Summer hours are here ☀️' received 3 new comments.",
      body: "Your post 'Summer hours are here ☀️' received 3 new comments and 12 reactions in the last hour.",
      link: () => "https://business.facebook.com/",
    },
  ],
  telegram: [
    {
      senderName: "Build Updates Bot",
      senderHandle: "@build_updates_bot",
      subject: "Deploy succeeded · main",
      snippet: "Deployment v3.18.2 to production succeeded in 1m 42s. View run.",
      body: "Deployment v3.18.2 to production succeeded in 1m 42s. 0 errors, 12 services updated. View full run on the dashboard.",
      link: () => "https://t.me/",
    },
    {
      senderName: "Founders Channel",
      senderHandle: "@founders_chat",
      subject: "New post in Founders Channel",
      snippet: "Sam: Has anyone shipped a launch via Product Hunt this quarter?",
      body: "Sam: Has anyone shipped a launch via Product Hunt this quarter? Curious about timing and whether it still moves the needle.",
      link: () => "https://t.me/",
    },
  ],
  whatsapp: [
    {
      senderName: "Acme Support",
      senderHandle: "+1 (555) 010-2024",
      subject: "Customer started a new conversation",
      snippet: "Hi — my order #4821 is showing delivered but I haven't received it. Can you help?",
      body: "Hi — my order #4821 is showing delivered but I haven't received it. Can you help?",
      link: () => "https://business.whatsapp.com/",
    },
    {
      senderName: "WhatsApp Business",
      senderHandle: "Webhook event",
      subject: "Template message delivered",
      snippet: "Your appointment_reminder template was delivered to 142 of 145 recipients.",
      body: "Your appointment_reminder template was delivered to 142 of 145 recipients. 3 failed (invalid number).",
      link: () => "https://business.whatsapp.com/",
    },
  ],
  tiktok: [
    {
      senderName: "TikTok Creator",
      senderHandle: "@yourhandle",
      subject: "Your video crossed 50K views",
      snippet: "Your video '3 things I learned' just crossed 50,000 views in 18 hours.",
      body: "Your video '3 things I learned shipping a notification app' just crossed 50,000 views in 18 hours, with a 38% completion rate. Trending in your category.",
      link: () => "https://www.tiktok.com/",
    },
    {
      senderName: "milo.makes",
      senderHandle: "@milo.makes",
      subject: "New comment on your video",
      snippet: "milo.makes: tutorial please 🙏 the cuts are so clean",
      body: "milo.makes commented: tutorial please 🙏 the cuts are so clean",
      link: () => "https://www.tiktok.com/",
    },
  ],
  x: [
    {
      senderName: "Alex Rivera",
      senderHandle: "@alexrivera",
      subject: "New mention on X",
      snippet: "@alexrivera: thanks @you — this saved my whole launch week 🙏",
      body: "@alexrivera mentioned you: thanks @you — this saved my whole launch week 🙏 anyone else here using YourRadar yet?",
      link: () => "https://x.com/notifications/mentions",
    },
    {
      senderName: "X",
      senderHandle: "Engagement",
      subject: "Your post is taking off",
      snippet: "1,820 impressions and 64 reposts in the first hour.",
      body: "Your post about notification UX has 1,820 impressions and 64 reposts in the first hour — well above your account average.",
      link: () => "https://x.com/home",
    },
  ],
};

interface EmailProviderSample extends SocialSample {}

const EMAIL_PROVIDER_SAMPLES: Record<
  "yahoo" | "aol" | "hotmail",
  EmailProviderSample[]
> = {
  yahoo: [
    {
      senderName: "Yahoo Finance",
      senderHandle: "alerts@yahoofinance.com",
      subject: "Daily market wrap · S&P closed up 0.6%",
      snippet: "Markets closed broadly higher today on better-than-expected jobs data.",
      body: "Markets closed broadly higher today on better-than-expected jobs data. Tech and consumer discretionary led the rally; energy lagged.",
      link: () => "https://mail.yahoo.com/",
    },
    {
      senderName: "Eventbrite",
      senderHandle: "noreply@eventbrite.com",
      subject: "Your ticket for Notification UX Meetup",
      snippet: "You're confirmed for Notification UX Meetup on Thursday 7 PM.",
      body: "You're confirmed for Notification UX Meetup on Thursday 7 PM at the Mission Studios space. Show this email at the door.",
      link: () => "https://mail.yahoo.com/",
    },
  ],
  aol: [
    {
      senderName: "AOL News",
      senderHandle: "newsletter@aol.com",
      subject: "Your morning briefing",
      snippet: "Top stories: market open, weather, and one good thing.",
      body: "Top stories from this morning: markets open mixed, sunny weekend ahead in your area, and one community story to start the day on a high note.",
      link: () => "https://mail.aol.com/",
    },
  ],
  hotmail: [
    {
      senderName: "Microsoft Family",
      senderHandle: "no-reply@microsoft.com",
      subject: "Weekly activity report",
      snippet: "Here's a summary of your family's screen time and app activity.",
      body: "Here's a summary of your family's screen time, app activity, and recent purchases for the past week.",
      link: () => "https://outlook.live.com/",
    },
    {
      senderName: "OneDrive",
      senderHandle: "noreply@onedrive.com",
      subject: "Files shared with you",
      snippet: "Maya shared 'Q4 strategy.docx' with you.",
      body: "Maya shared 'Q4 strategy.docx' with you. Open in OneDrive to review and add comments.",
      link: () => "https://outlook.live.com/",
    },
  ],
};

interface DeliverySample {
  status: DeliveryStatus;
  sender: string;
  subject: string;
  snippet: string;
  body: string;
}

const DELIVERY_STATUS_FLOW: DeliveryStatus[] = [
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delayed",
];

const DELIVERY_SAMPLES: Record<
  "evri" | "dpd" | "royalmail" | "amazon",
  DeliverySample[]
> = {
  evri: [
    {
      status: "in_transit",
      sender: "Evri",
      subject: "Your parcel is on its way",
      snippet: "Your parcel has left our hub and is heading to your local depot.",
      body: "Your parcel has left our sorting hub and is heading to your local depot. We'll text you a 1-hour delivery window once it's out for delivery.",
    },
    {
      status: "out_for_delivery",
      sender: "Evri",
      subject: "Out for delivery today",
      snippet: "Your parcel is on the van and will arrive between 2 PM and 4 PM.",
      body: "Your parcel is on the van today. Estimated delivery window: 2 PM – 4 PM. You can update delivery preferences in the Evri app.",
    },
  ],
  dpd: [
    {
      status: "out_for_delivery",
      sender: "DPD",
      subject: "Your 1-hour window is 11:20–12:20",
      snippet: "Your driver Marek will deliver your parcel between 11:20 and 12:20.",
      body: "Your driver Marek will deliver your parcel between 11:20 and 12:20. Track live on the DPD app for the most accurate ETA.",
    },
    {
      status: "delivered",
      sender: "DPD",
      subject: "Delivered · signed for by you",
      snippet: "Your parcel was delivered at 11:42 and signed for at the front door.",
      body: "Your parcel was delivered at 11:42 and signed for at the front door. View the delivery photo in the DPD tracking page.",
    },
  ],
  royalmail: [
    {
      status: "in_transit",
      sender: "Royal Mail",
      subject: "Item received at sorting centre",
      snippet: "Your tracked item has been received at the Birmingham Mail Centre.",
      body: "Your tracked item has been received at the Birmingham Mail Centre and will be sent to your local delivery office overnight.",
    },
    {
      status: "delayed",
      sender: "Royal Mail",
      subject: "Slight delay on your delivery",
      snippet: "We're seeing slight delays in your area. Updated ETA: tomorrow.",
      body: "We're seeing slight delays in your area due to network volume. Your parcel's updated estimated delivery date is tomorrow.",
    },
  ],
  amazon: [
    {
      status: "out_for_delivery",
      sender: "Amazon",
      subject: "Arriving today",
      snippet: "Your order with 2 items is arriving today between 5 PM and 9 PM.",
      body: "Your order with 2 items is arriving today between 5 PM and 9 PM. Track your delivery driver on the Amazon app for live updates.",
    },
    {
      status: "delivered",
      sender: "Amazon",
      subject: "Delivered · left in safe place",
      snippet: "Your package was left in the safe place you selected.",
      body: "Your package was left in the safe place you selected (porch). View the delivery photo in Your Orders.",
    },
  ],
};

const DEFAULT_SETTINGS: SettingsState = {
  pushEnabled: true,
  inAppToastsEnabled: true,
  soundsEnabled: false,
  reducedMotion: false,
  testModeEnabled: false,
};

function pickFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function pickInstagramSample(kind: InstagramEventKind): InstagramSample {
  return pickFrom(INSTAGRAM_SAMPLES[kind]);
}

function buildEmailNotification(account: ConnectedAccount): EmailNotification {
  const provider = account.provider;
  const id = uid();
  if (provider === "yahoo" || provider === "aol" || provider === "hotmail") {
    const sample = pickFrom(EMAIL_PROVIDER_SAMPLES[provider]);
    return {
      id,
      accountId: account.id,
      provider,
      emailAddress: account.emailAddress,
      senderName: sample.senderName,
      senderEmail: sample.senderHandle,
      subject: sample.subject,
      snippet: sample.snippet,
      bodyPreview: sample.body,
      receivedAt: Date.now(),
      providerWebLink: sample.link(account.emailAddress),
      isSeen: false,
    };
  }
  const sample = pickFrom(EMAIL_SAMPLES);
  const baseLink =
    provider === "gmail"
      ? `https://mail.google.com/mail/u/0/#inbox/${id}`
      : `https://outlook.office.com/mail/inbox/id/${id}`;
  return {
    id,
    accountId: account.id,
    provider,
    emailAddress: account.emailAddress,
    senderName: sample.name,
    senderEmail: sample.email,
    subject: sample.subject,
    snippet: sample.snippet,
    bodyPreview: sample.body,
    receivedAt: Date.now(),
    providerWebLink: baseLink,
    isSeen: false,
  };
}

function buildInstagramNotification(
  account: ConnectedAccount,
  kindHint?: InstagramEventKind,
): EmailNotification {
  const kind: InstagramEventKind =
    kindHint ?? (["dm", "comment", "mention", "insight"][Math.floor(Math.random() * 4)] as InstagramEventKind);
  const sample = pickInstagramSample(kind);
  const id = uid();
  const link =
    kind === "dm"
      ? `https://www.instagram.com/direct/inbox/`
      : kind === "comment" || kind === "mention"
        ? `https://www.instagram.com/p/${id.slice(0, 8)}/`
        : `https://www.instagram.com/${account.emailAddress.replace(/^@/, "")}/`;
  return {
    id,
    accountId: account.id,
    provider: "instagram",
    emailAddress: account.emailAddress,
    senderName: sample.senderName,
    senderEmail: sample.senderHandle,
    subject: sample.subject,
    snippet: sample.snippet,
    bodyPreview: sample.body,
    receivedAt: Date.now(),
    providerWebLink: link,
    isSeen: false,
    instagramEventKind: kind,
    mediaCaption: sample.caption,
  };
}

function buildSocialNotification(account: ConnectedAccount): EmailNotification {
  const provider = account.provider as
    | "linkedin"
    | "facebook"
    | "telegram"
    | "whatsapp"
    | "tiktok"
    | "x";
  const sample = pickFrom(SOCIAL_SAMPLES[provider]);
  return {
    id: uid(),
    accountId: account.id,
    provider: account.provider,
    emailAddress: account.emailAddress,
    senderName: sample.senderName,
    senderEmail: sample.senderHandle,
    subject: sample.subject,
    snippet: sample.snippet,
    bodyPreview: sample.body,
    receivedAt: Date.now(),
    providerWebLink: sample.link(account.emailAddress),
    isSeen: false,
  };
}

function buildDeliveryNotification(account: ConnectedAccount): EmailNotification {
  const provider = account.provider as "evri" | "dpd" | "royalmail" | "amazon";
  const samples = DELIVERY_SAMPLES[provider];
  const current = account.deliveryDetails?.status;
  // Pick a sample whose status is the next logical step from the current
  // status so the simulated alerts feel like a real status change.
  const candidates = samples.filter((s) => s.status !== current);
  const sample = pickFrom(candidates.length > 0 ? candidates : samples);
  const trackingNumber = account.deliveryDetails?.trackingNumber ?? account.emailAddress;
  return {
    id: uid(),
    accountId: account.id,
    provider: account.provider,
    emailAddress: account.emailAddress,
    senderName: sample.sender,
    senderEmail: `tracking · ${trackingNumber}`,
    subject: sample.subject,
    snippet: sample.snippet,
    bodyPreview: sample.body,
    receivedAt: Date.now(),
    providerWebLink: account.deliveryDetails?.publicTrackingUrl,
    isSeen: false,
    deliveryStatus: sample.status,
  };
}

function defaultEmptyByProvider(): Record<Provider, number> {
  const out = {} as Record<Provider, number>;
  for (const p of PROVIDER_ORDER) out[p] = 0;
  return out;
}

function makeSeed(): PersistedState {
  const now = Date.now();
  const accounts: ConnectedAccount[] = [
    {
      id: uid(),
      provider: "gmail",
      emailAddress: "you@gmail.com",
      displayName: "Personal",
      status: "connected",
      lastSyncAt: now - 1000 * 60 * 2,
      createdAt: now - 1000 * 60 * 60 * 24 * 7,
      notificationsEnabled: true,
    },
    {
      id: uid(),
      provider: "outlook",
      emailAddress: "you@company.com",
      displayName: "Work",
      status: "connected",
      lastSyncAt: now - 1000 * 60 * 12,
      createdAt: now - 1000 * 60 * 60 * 24 * 14,
      notificationsEnabled: true,
    },
    {
      id: uid(),
      provider: "instagram",
      emailAddress: "@yourhandle",
      displayName: "Creator",
      status: "connected",
      lastSyncAt: now - 1000 * 60 * 6,
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
      instagramKind: "creator",
      notificationsEnabled: true,
    },
  ];

  const gmail = accounts[0]!;
  const outlook = accounts[1]!;
  const insta = accounts[2]!;

  const notifications: EmailNotification[] = [];

  const sample0 = EMAIL_SAMPLES[0]!;
  notifications.push({
    id: uid(),
    accountId: gmail.id,
    provider: "gmail",
    emailAddress: gmail.emailAddress,
    senderName: sample0.name,
    senderEmail: sample0.email,
    subject: sample0.subject,
    snippet: sample0.snippet,
    bodyPreview: sample0.body,
    receivedAt: now - 3 * 60 * 1000,
    providerWebLink: "https://mail.google.com/mail/u/0/#inbox/seed1",
    isSeen: false,
  });

  const igDm = INSTAGRAM_SAMPLES.dm[0]!;
  notifications.push({
    id: uid(),
    accountId: insta.id,
    provider: "instagram",
    emailAddress: insta.emailAddress,
    senderName: igDm.senderName,
    senderEmail: igDm.senderHandle,
    subject: igDm.subject,
    snippet: igDm.snippet,
    bodyPreview: igDm.body,
    receivedAt: now - 9 * 60 * 1000,
    providerWebLink: "https://www.instagram.com/direct/inbox/",
    isSeen: false,
    instagramEventKind: "dm",
  });

  const sample1 = EMAIL_SAMPLES[2]!;
  notifications.push({
    id: uid(),
    accountId: outlook.id,
    provider: "outlook",
    emailAddress: outlook.emailAddress,
    senderName: sample1.name,
    senderEmail: sample1.email,
    subject: sample1.subject,
    snippet: sample1.snippet,
    bodyPreview: sample1.body,
    receivedAt: now - 22 * 60 * 1000,
    providerWebLink: "https://outlook.office.com/mail/inbox/id/seed3",
    isSeen: false,
  });

  return { accounts, notifications, settings: DEFAULT_SETTINGS };
}

function buildDemoAccount(provider: Provider): ConnectedAccount {
  const handles: Record<Provider, { addr: string; display: string }> = {
    gmail: { addr: "demo@gmail.com", display: "Demo" },
    outlook: { addr: "demo@outlook.com", display: "Demo" },
    yahoo: { addr: "demo@yahoo.com", display: "Demo" },
    aol: { addr: "demo@aol.com", display: "Demo" },
    hotmail: { addr: "demo@hotmail.com", display: "Demo" },
    instagram: { addr: "@demo.creator", display: "Demo" },
    linkedin: { addr: "linkedin.com/in/demo", display: "Demo" },
    facebook: { addr: "Demo Page", display: "Demo Page" },
    telegram: { addr: "@demo_channel", display: "Demo" },
    whatsapp: { addr: "+1 555 010 0000", display: "Demo Business" },
    tiktok: { addr: "@demo.creator", display: "Demo" },
    x: { addr: "@demo", display: "Demo" },
    evri: { addr: "EVR123456789", display: "Demo parcel" },
    dpd: { addr: "DPD987654321", display: "Demo parcel" },
    royalmail: { addr: "RM1234567GB", display: "Demo parcel" },
    amazon: { addr: "TBA123456789", display: "Demo order" },
  };
  const h = handles[provider];
  const base: ConnectedAccount = {
    id: `demo-${provider}-${uid()}`,
    provider,
    emailAddress: h.addr,
    displayName: h.display,
    status: "connected",
    lastSyncAt: Date.now(),
    createdAt: Date.now(),
    notificationsEnabled: true,
  };
  if (isDeliveryProvider(provider)) {
    base.deliveryDetails = {
      trackingNumber: h.addr,
      label: h.display,
      merchant: provider === "amazon" ? "Amazon" : undefined,
      status: "in_transit",
      lastCheckedAt: Date.now(),
      publicTrackingUrl: trackingUrlFor(provider, h.addr),
    };
  }
  return base;
}

function trackingUrlFor(provider: Provider, trackingNumber: string): string | undefined {
  const t = encodeURIComponent(trackingNumber.trim());
  switch (provider) {
    case "evri":
      return `https://www.evri.com/track/parcel/${t}`;
    case "dpd":
      return `https://track.dpd.co.uk/search?reference=${t}`;
    case "royalmail":
      return `https://www.royalmail.com/track-your-item#/tracking-results/${t}`;
    case "amazon":
      return `https://www.amazon.co.uk/gp/your-account/order-details?orderID=${t}`;
    default:
      return undefined;
  }
}

function normalizeIdentifier(provider: Provider, raw: string): string {
  const trimmed = raw.trim();
  if (provider === "instagram" || provider === "tiktok" || provider === "x") {
    return trimmed.startsWith("@") ? trimmed.toLowerCase() : `@${trimmed.toLowerCase()}`;
  }
  if (provider === "telegram") {
    // Bot tokens contain ':' and are case-sensitive; channel/user handles are
    // case-insensitive and should always be prefixed with '@' for dedupe.
    if (trimmed.includes(":")) return trimmed;
    const lower = trimmed.toLowerCase();
    return lower.startsWith("@") ? lower : `@${lower}`;
  }
  if (
    provider === "gmail" ||
    provider === "outlook" ||
    provider === "yahoo" ||
    provider === "aol" ||
    provider === "hotmail"
  ) {
    return trimmed.toLowerCase();
  }
  if (provider === "linkedin") {
    // Canonicalize linkedin.com/in/<vanity> regardless of scheme/www/trailing slash.
    const lower = trimmed.toLowerCase().replace(/\/+$/, "");
    const m = lower.match(/(?:^|\/)in\/([a-z0-9._-]+)$/);
    return m ? `linkedin.com/in/${m[1]}` : lower;
  }
  if (provider === "whatsapp") {
    // Strip everything but '+' and digits so "+1 555 010-0000" matches "+15550100000".
    return trimmed.replace(/[^\d+]/g, "");
  }
  if (provider === "facebook") {
    // Page/profile names are case-insensitive on Facebook search.
    return trimmed.toLowerCase();
  }
  return trimmed;
}

function deriveDisplayName(provider: Provider, normalized: string): string {
  if (
    provider === "instagram" ||
    provider === "tiktok" ||
    provider === "telegram" ||
    provider === "x"
  ) {
    return normalized.replace(/^@/, "");
  }
  if (
    provider === "gmail" ||
    provider === "outlook" ||
    provider === "yahoo" ||
    provider === "aol" ||
    provider === "hotmail"
  ) {
    return normalized.split("@")[0]!;
  }
  if (provider === "linkedin") {
    const parts = normalized.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? normalized;
  }
  return normalized;
}

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          // One-time migration from older storage versions.
          for (const legacy of LEGACY_STORAGE_KEYS) {
            const legacyRaw = await AsyncStorage.getItem(legacy);
            if (legacyRaw) {
              raw = legacyRaw;
              break;
            }
          }
        }
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedState;
          const migratedAccounts = (parsed.accounts ?? []).map((a) => ({
            ...a,
            notificationsEnabled: a.notificationsEnabled ?? true,
          }));
          setAccounts(migratedAccounts);
          setNotifications(parsed.notifications ?? []);
          setSettings({ ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) });
        } else {
          const seed = makeSeed();
          setAccounts(seed.accounts);
          setNotifications(seed.notifications);
          setSettings(seed.settings);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        }
      } catch {
        const seed = makeSeed();
        if (!cancelled) {
          setAccounts(seed.accounts);
          setNotifications(seed.notifications);
          setSettings(seed.settings);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const state: PersistedState = { accounts, notifications, settings };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [ready, accounts, notifications, settings]);

  const connectAccount = useCallback<InboxContextValue["connectAccount"]>(
    (provider, handleOrEmail, extras): ConnectAccountResult => {
      const trimmed = handleOrEmail.trim();
      if (!trimmed) {
        return { status: "invalid", reason: "Please enter an address or handle." };
      }

      const isEmail =
        provider === "gmail" ||
        provider === "outlook" ||
        provider === "yahoo" ||
        provider === "aol" ||
        provider === "hotmail";
      if (isEmail && !trimmed.includes("@")) {
        return { status: "invalid", reason: "Enter a valid email address." };
      }

      const normalized = normalizeIdentifier(provider, trimmed);
      const existing = accounts.find(
        (a) => a.emailAddress === normalized && a.provider === provider,
      );
      if (existing) {
        return { status: "duplicate", account: existing };
      }

      const nickname = extras?.nickname?.trim();
      const account: ConnectedAccount = {
        id: uid(),
        provider,
        emailAddress: normalized,
        displayName:
          nickname && nickname.length > 0
            ? nickname
            : deriveDisplayName(provider, normalized),
        status: "connected",
        lastSyncAt: Date.now(),
        createdAt: Date.now(),
        notificationsEnabled: true,
        instagramKind:
          provider === "instagram" ? extras?.instagramKind ?? "creator" : undefined,
      };
      setAccounts((prev) => [...prev, account]);
      return { status: "created", account };
    },
    [accounts],
  );

  const renameAccount = useCallback((accountId: string, displayName: string) => {
    const next = displayName.trim();
    if (!next) return;
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, displayName: next } : a)),
    );
  }, []);

  const addDelivery = useCallback<InboxContextValue["addDelivery"]>(
    (provider, details) => {
      const trackingNumber = details.trackingNumber.trim();
      const label = details.label.trim() || "Tracked parcel";
      const account: ConnectedAccount = {
        id: uid(),
        provider,
        emailAddress: trackingNumber,
        displayName: label,
        status: "connected",
        lastSyncAt: Date.now(),
        createdAt: Date.now(),
        notificationsEnabled: details.notificationsEnabled ?? true,
        deliveryDetails: {
          trackingNumber,
          label,
          merchant: details.merchant?.trim() || undefined,
          expectedAt: details.expectedAt,
          status: "added",
          lastCheckedAt: Date.now(),
          publicTrackingUrl: trackingUrlFor(provider, trackingNumber),
        },
      };
      setAccounts((prev) => [...prev, account]);
      return account;
    },
    [],
  );

  const disconnectAccount = useCallback((accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    setNotifications((prev) => prev.filter((n) => n.accountId !== accountId));
  }, []);

  const reconnectAccount = useCallback((accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId ? { ...a, status: "connected", lastSyncAt: Date.now() } : a,
      ),
    );
  }, []);

  const toggleAccountNotifications = useCallback((accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? { ...a, notificationsEnabled: !a.notificationsEnabled }
          : a,
      ),
    );
  }, []);

  const simulateIncoming = useCallback(
    (
      provider: Provider,
      accountId?: string,
      instagramEventKind?: InstagramEventKind,
    ): EmailNotification | null => {
      const candidates = accounts.filter(
        (a) => a.provider === provider && a.status === "connected",
      );

      // Per the visibility rule: if no real account exists for this provider,
      // mint a demo account, persist it, and then create the notification
      // under it. That way the dashboard, filters, and accounts page will
      // immediately reflect the newly-connected source.
      let account: ConnectedAccount;
      let mintedAccount: ConnectedAccount | null = null;
      if (candidates.length === 0) {
        account = buildDemoAccount(provider);
        mintedAccount = account;
      } else if (accountId) {
        account = candidates.find((a) => a.id === accountId) ?? candidates[0]!;
      } else {
        account = candidates[Math.floor(Math.random() * candidates.length)]!;
      }

      let notif: EmailNotification;
      if (provider === "instagram") {
        notif = buildInstagramNotification(account, instagramEventKind);
      } else if (
        provider === "linkedin" ||
        provider === "facebook" ||
        provider === "telegram" ||
        provider === "whatsapp" ||
        provider === "tiktok" ||
        provider === "x"
      ) {
        notif = buildSocialNotification(account);
      } else if (isDeliveryProvider(provider)) {
        notif = buildDeliveryNotification(account);
      } else {
        notif = buildEmailNotification(account);
      }

      setNotifications((prev) => [notif, ...prev]);
      setAccounts((prev) => {
        let next = prev;
        if (mintedAccount) {
          next = [...prev, mintedAccount];
        }
        return next.map((a) => {
          if (a.id !== account.id) return a;
          if (notif.deliveryStatus && a.deliveryDetails) {
            return {
              ...a,
              lastSyncAt: Date.now(),
              deliveryDetails: {
                ...a.deliveryDetails,
                status: notif.deliveryStatus,
                lastCheckedAt: Date.now(),
              },
            };
          }
          return { ...a, lastSyncAt: Date.now() };
        });
      });
      return notif;
    },
    [accounts],
  );

  const markSeen = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isSeen: true } : n)),
    );
  }, []);

  const markAllSeen = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isSeen: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback((patch: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const getNotification = useCallback(
    (id: string) => notifications.find((n) => n.id === id),
    [notifications],
  );

  const getAccount = useCallback(
    (id: string) => accounts.find((a) => a.id === id),
    [accounts],
  );

  const unseenByAccount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notifications) {
      if (!n.isSeen) map[n.accountId] = (map[n.accountId] ?? 0) + 1;
    }
    return map;
  }, [notifications]);

  const unseenByProvider = useMemo<Record<Provider, number>>(() => {
    const m = defaultEmptyByProvider();
    for (const n of notifications) {
      if (!n.isSeen) m[n.provider] += 1;
    }
    return m;
  }, [notifications]);

  const unseenTotal = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.isSeen ? 0 : 1), 0),
    [notifications],
  );

  const connectedProviders = useMemo<Provider[]>(() => {
    const seen = new Set<Provider>();
    for (const a of accounts) seen.add(a.provider);
    return PROVIDER_ORDER.filter((p) => seen.has(p));
  }, [accounts]);

  const fullyConfiguredProviders: Provider[] = ["gmail", "outlook"];
  void DELIVERY_STATUS_FLOW;

  const value: InboxContextValue = {
    ready,
    accounts,
    notifications,
    settings,
    unseenTotal,
    unseenByAccount,
    unseenByProvider,
    connectedProviders,
    fullyConfiguredProviders,
    connectAccount,
    addDelivery,
    disconnectAccount,
    reconnectAccount,
    renameAccount,
    toggleAccountNotifications,
    simulateIncoming,
    markSeen,
    markAllSeen,
    clearAll,
    updateSettings,
    getNotification,
    getAccount,
  };

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within InboxProvider");
  return ctx;
}
