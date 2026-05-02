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
  type ConnectedAccount,
  type EmailNotification,
  type InstagramEventKind,
  type Provider,
  type SettingsState,
} from "@/types";
import { uid } from "@/utils/format";

const STORAGE_KEY = "yourradar_state_v3";

interface PersistedState {
  accounts: ConnectedAccount[];
  notifications: EmailNotification[];
  settings: SettingsState;
}

interface InboxContextValue {
  ready: boolean;
  accounts: ConnectedAccount[];
  notifications: EmailNotification[];
  settings: SettingsState;
  unseenTotal: number;
  unseenByAccount: Record<string, number>;
  unseenByProvider: Record<Provider, number>;
  /** Providers we have full mock OAuth + sample data for (Gmail/Outlook/Instagram). */
  fullyConfiguredProviders: Provider[];
  connectAccount: (
    provider: Provider,
    handleOrEmail: string,
    extras?: { instagramKind?: ConnectedAccount["instagramKind"] },
  ) => void;
  disconnectAccount: (accountId: string) => void;
  reconnectAccount: (accountId: string) => void;
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
  "linkedin" | "facebook" | "telegram" | "whatsapp" | "tiktok",
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
};

const DEFAULT_SETTINGS: SettingsState = {
  pushEnabled: true,
  inAppToastsEnabled: true,
  soundsEnabled: false,
  reducedMotion: false,
};

function pickFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function pickInstagramSample(kind: InstagramEventKind): InstagramSample {
  return pickFrom(INSTAGRAM_SAMPLES[kind]);
}

function buildEmailNotification(account: ConnectedAccount): EmailNotification {
  const sample = pickFrom(EMAIL_SAMPLES);
  const id = uid();
  const baseLink =
    account.provider === "gmail"
      ? `https://mail.google.com/mail/u/0/#inbox/${id}`
      : `https://outlook.office.com/mail/inbox/id/${id}`;
  return {
    id,
    accountId: account.id,
    provider: account.provider,
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
    | "tiktok";
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

function defaultEmptyByProvider(): Record<Provider, number> {
  return {
    gmail: 0,
    outlook: 0,
    instagram: 0,
    linkedin: 0,
    facebook: 0,
    telegram: 0,
    whatsapp: 0,
    tiktok: 0,
  };
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

  const igComment = INSTAGRAM_SAMPLES.comment[0]!;
  notifications.push({
    id: uid(),
    accountId: insta.id,
    provider: "instagram",
    emailAddress: insta.emailAddress,
    senderName: igComment.senderName,
    senderEmail: igComment.senderHandle,
    subject: igComment.subject,
    snippet: igComment.snippet,
    bodyPreview: igComment.body,
    receivedAt: now - 48 * 60 * 1000,
    providerWebLink: "https://www.instagram.com/p/seed4/",
    isSeen: true,
    instagramEventKind: "comment",
    mediaCaption: igComment.caption,
  });

  const sample2 = EMAIL_SAMPLES[3]!;
  notifications.push({
    id: uid(),
    accountId: gmail.id,
    provider: "gmail",
    emailAddress: gmail.emailAddress,
    senderName: sample2.name,
    senderEmail: sample2.email,
    subject: sample2.subject,
    snippet: sample2.snippet,
    bodyPreview: sample2.body,
    receivedAt: now - 95 * 60 * 1000,
    providerWebLink: "https://mail.google.com/mail/u/0/#inbox/seed5",
    isSeen: true,
  });

  const igInsight = INSTAGRAM_SAMPLES.insight[0]!;
  notifications.push({
    id: uid(),
    accountId: insta.id,
    provider: "instagram",
    emailAddress: insta.emailAddress,
    senderName: igInsight.senderName,
    senderEmail: igInsight.senderHandle,
    subject: igInsight.subject,
    snippet: igInsight.snippet,
    bodyPreview: igInsight.body,
    receivedAt: now - 4 * 60 * 60 * 1000,
    providerWebLink: "https://www.instagram.com/yourhandle/",
    isSeen: true,
    instagramEventKind: "insight",
  });

  const sample3 = EMAIL_SAMPLES[5]!;
  notifications.push({
    id: uid(),
    accountId: outlook.id,
    provider: "outlook",
    emailAddress: outlook.emailAddress,
    senderName: sample3.name,
    senderEmail: sample3.email,
    subject: sample3.subject,
    snippet: sample3.snippet,
    bodyPreview: sample3.body,
    receivedAt: now - 6 * 60 * 60 * 1000,
    providerWebLink: "https://outlook.office.com/mail/inbox/id/seed7",
    isSeen: true,
  });

  return { accounts, notifications, settings: DEFAULT_SETTINGS };
}

function buildDemoAccount(provider: Provider): ConnectedAccount {
  const handles: Record<Provider, { addr: string; display: string }> = {
    gmail: { addr: "demo@gmail.com", display: "Demo" },
    outlook: { addr: "demo@outlook.com", display: "Demo" },
    instagram: { addr: "@demo.creator", display: "Demo" },
    linkedin: { addr: "linkedin.com/in/demo", display: "Demo" },
    facebook: { addr: "Demo Page", display: "Demo" },
    telegram: { addr: "@demo_channel", display: "Demo" },
    whatsapp: { addr: "+1 555 010 0000", display: "Demo" },
    tiktok: { addr: "@demo.creator", display: "Demo" },
  };
  const h = handles[provider];
  return {
    id: `demo-${provider}`,
    provider,
    emailAddress: h.addr,
    displayName: h.display,
    status: "connected",
    lastSyncAt: Date.now(),
    createdAt: Date.now(),
    notificationsEnabled: true,
  };
}

function normalizeIdentifier(provider: Provider, raw: string): string {
  const trimmed = raw.trim();
  if (provider === "instagram" || provider === "tiktok") {
    return trimmed.startsWith("@") ? trimmed.toLowerCase() : `@${trimmed.toLowerCase()}`;
  }
  if (provider === "telegram") {
    return trimmed.startsWith("@") || trimmed.includes(":")
      ? trimmed
      : `@${trimmed}`;
  }
  if (provider === "gmail" || provider === "outlook") {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

function deriveDisplayName(provider: Provider, normalized: string): string {
  if (provider === "instagram" || provider === "tiktok" || provider === "telegram") {
    return normalized.replace(/^@/, "");
  }
  if (provider === "gmail" || provider === "outlook") {
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
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedState;
          // Backfill notificationsEnabled on accounts persisted with the older schema.
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
    (provider, handleOrEmail, extras) => {
      const trimmed = handleOrEmail.trim();
      if (!trimmed) return;

      if ((provider === "gmail" || provider === "outlook") && !trimmed.includes("@")) {
        return;
      }

      const normalized = normalizeIdentifier(provider, trimmed);

      setAccounts((prev) => {
        if (
          prev.some((a) => a.emailAddress === normalized && a.provider === provider)
        ) {
          return prev;
        }
        const account: ConnectedAccount = {
          id: uid(),
          provider,
          emailAddress: normalized,
          displayName: deriveDisplayName(provider, normalized),
          status: "connected",
          lastSyncAt: Date.now(),
          createdAt: Date.now(),
          notificationsEnabled: true,
          instagramKind:
            provider === "instagram" ? extras?.instagramKind ?? "creator" : undefined,
        };
        return [...prev, account];
      });
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
      // If no real account exists for this provider, mint a synthetic demo
      // account so the simulate buttons still work for every provider.
      const account: ConnectedAccount =
        candidates.length === 0
          ? buildDemoAccount(provider)
          : accountId
            ? candidates.find((a) => a.id === accountId) ?? candidates[0]!
            : candidates[Math.floor(Math.random() * candidates.length)]!;

      let notif: EmailNotification;
      if (provider === "instagram") {
        notif = buildInstagramNotification(account, instagramEventKind);
      } else if (
        provider === "linkedin" ||
        provider === "facebook" ||
        provider === "telegram" ||
        provider === "whatsapp" ||
        provider === "tiktok"
      ) {
        notif = buildSocialNotification(account);
      } else {
        notif = buildEmailNotification(account);
      }

      setNotifications((prev) => [notif, ...prev]);
      if (candidates.length > 0) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === account.id ? { ...a, lastSyncAt: Date.now() } : a)),
        );
      }
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

  const fullyConfiguredProviders: Provider[] = ["gmail", "outlook"];
  // Reference PROVIDER_ORDER so it is treated as used in environments that
  // tree-shake unused exports.
  void PROVIDER_ORDER;

  const value: InboxContextValue = {
    ready,
    accounts,
    notifications,
    settings,
    unseenTotal,
    unseenByAccount,
    unseenByProvider,
    fullyConfiguredProviders,
    connectAccount,
    disconnectAccount,
    reconnectAccount,
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
